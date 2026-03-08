import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { InputValidator } from '@/lib/middleware/input-validator'
import { CreateContactSchema, SendMessageSchema, CreateBroadcastSchema } from '@/lib/validation/schemas'
import { z } from 'zod'

/**
 * Property-Based Tests for Input Validation
 * 
 * **Validates: Requirements 1.2, 1.3, 1.4, 1.5**
 * 
 * These tests verify that the InputValidator correctly rejects invalid inputs
 * with appropriate error messages and status codes, and that error messages
 * are sanitized to prevent exposure of internal system details.
 */

describe('Feature: security-optimization, Property 1: Input Validation Rejection', () => {
  /**
   * Property Test: Invalid inputs should be rejected with validation errors
   * 
   * This test generates random invalid inputs and verifies that:
   * 1. Validation fails (success = false)
   * 2. Error messages are provided
   * 3. Error messages are sanitized (no internal details)
   * 4. Error codes are provided for programmatic handling
   */
  it('should reject invalid contact data with validation errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate invalid contact data
        fc.record({
          // Invalid phone numbers (not E.164 format)
          phone_number: fc.oneof(
            fc.constant(''), // Empty
            fc.constant('abc123'), // Contains letters
            fc.constant('0123456789'), // Starts with 0
            fc.constant('+0123456789'), // Starts with 0 after +
            fc.constant('123'), // Too short
            fc.constant('+12345678901234567'), // Too long (>15 digits)
            fc.string().filter(s => s.length > 0 && !s.match(/^\+?[1-9]\d{1,14}$/)) // Random invalid
          ),
          // Optional fields with invalid values
          name: fc.option(fc.oneof(
            fc.constant(''), // Empty string (min 1)
            fc.string({ minLength: 256 }) // Too long (max 255)
          )),
          email: fc.option(fc.oneof(
            fc.constant('invalid'), // No @ or domain
            fc.constant('invalid@'), // No domain
            fc.constant('@example.com'), // No local part
            fc.constant('invalid@example'), // No TLD
            fc.constant('invalid @example.com') // Contains space
          )),
          notes: fc.option(fc.string({ minLength: 5001 })), // Too long (max 5000)
          tags: fc.option(fc.array(fc.string(), { minLength: 51 })) // Too many tags (max 50)
        }),
        async (invalidInput) => {
          const result = InputValidator.validate(CreateContactSchema, invalidInput)
          
          // Validation should fail
          expect(result.success).toBe(false)
          expect(result.data).toBeUndefined()
          
          // Should have error details
          expect(result.errors).toBeDefined()
          expect(result.errors!.length).toBeGreaterThan(0)
          
          // Each error should have required fields
          result.errors!.forEach(error => {
            expect(error.field).toBeDefined()
            expect(error.message).toBeDefined()
            expect(error.code).toBeDefined()
            
            // Error messages should be sanitized (no internal details)
            const message = error.message.toLowerCase()
            expect(message).not.toMatch(/database|schema|table|column|sql|query|stack|trace/i)
          })
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Invalid message data should be rejected
   * 
   * Tests validation of message sending with invalid conversation IDs,
   * content length violations, and media type mismatches.
   */
  it('should reject invalid message data with validation errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // Invalid conversation IDs
          conversation_id: fc.oneof(
            fc.constant(''), // Empty
            fc.constant('not-a-uuid'), // Invalid format
            fc.string().filter(s => !s.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i))
          ),
          // Invalid content
          content: fc.oneof(
            fc.constant(''), // Empty (min 1)
            fc.string({ minLength: 4097 }) // Too long (max 4096)
          ),
          // Media URL without media type (should fail refinement)
          media_url: fc.option(fc.webUrl()),
          // Omit media_type to trigger refinement error
        }),
        async (invalidInput) => {
          const result = InputValidator.validate(SendMessageSchema, invalidInput)
          
          // Validation should fail
          expect(result.success).toBe(false)
          expect(result.data).toBeUndefined()
          
          // Should have error details
          expect(result.errors).toBeDefined()
          expect(result.errors!.length).toBeGreaterThan(0)
          
          // Verify error sanitization
          result.errors!.forEach(error => {
            expect(error.field).toBeDefined()
            expect(error.message).toBeDefined()
            expect(error.code).toBeDefined()
            
            // No internal system details
            const message = error.message.toLowerCase()
            expect(message).not.toMatch(/database|schema|table|column|sql|query|stack|trace|supabase|postgres/i)
          })
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Invalid broadcast data should be rejected
   * 
   * Tests validation of broadcast creation with invalid UUIDs,
   * length violations, and datetime format issues.
   */
  it('should reject invalid broadcast data with validation errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // Invalid names
          name: fc.oneof(
            fc.constant(''), // Empty (min 1)
            fc.string({ minLength: 256 }) // Too long (max 255)
          ),
          // Invalid message templates
          message_template: fc.oneof(
            fc.constant(''), // Empty (min 1)
            fc.string({ minLength: 4097 }) // Too long (max 4096)
          ),
          // Invalid recipient list IDs
          recipient_list_id: fc.oneof(
            fc.constant(''), // Empty
            fc.constant('not-a-uuid'), // Invalid format
            fc.string().filter(s => !s.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i))
          ),
          // Invalid datetime format
          scheduled_at: fc.option(fc.oneof(
            fc.constant('invalid-date'),
            fc.constant('2024-13-45'), // Invalid date
            fc.string().filter(s => s.length > 0 && !s.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/))
          ))
        }),
        async (invalidInput) => {
          const result = InputValidator.validate(CreateBroadcastSchema, invalidInput)
          
          // Validation should fail
          expect(result.success).toBe(false)
          expect(result.data).toBeUndefined()
          
          // Should have error details
          expect(result.errors).toBeDefined()
          expect(result.errors!.length).toBeGreaterThan(0)
          
          // Verify error sanitization
          result.errors!.forEach(error => {
            expect(error.field).toBeDefined()
            expect(error.message).toBeDefined()
            expect(error.code).toBeDefined()
            
            // No internal system details exposed
            const message = error.message.toLowerCase()
            expect(message).not.toMatch(/database|schema|table|column|sql|query|stack|trace|supabase|postgres|redis|env|environment/i)
          })
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Missing required fields should be rejected
   * 
   * Tests that schemas properly reject inputs with missing required fields.
   */
  it('should reject inputs with missing required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate objects with some required fields missing
        fc.oneof(
          fc.constant({}), // Empty object
          fc.record({ name: fc.string() }), // Missing phone_number for contact
          fc.record({ phone_number: fc.string() }), // Has phone but might be invalid
          fc.record({ conversation_id: fc.string() }), // Missing content for message
          fc.record({ content: fc.string() }) // Missing conversation_id for message
        ),
        async (invalidInput) => {
          // Try validating against contact schema
          const contactResult = InputValidator.validate(CreateContactSchema, invalidInput)
          
          // Try validating against message schema
          const messageResult = InputValidator.validate(SendMessageSchema, invalidInput)
          
          // At least one should fail (both might fail)
          const atLeastOneFailed = !contactResult.success || !messageResult.success
          expect(atLeastOneFailed).toBe(true)
          
          // Check failed validations for proper error structure
          const failedResults = [contactResult, messageResult].filter(r => !r.success)
          
          failedResults.forEach(result => {
            expect(result.errors).toBeDefined()
            expect(result.errors!.length).toBeGreaterThan(0)
            
            // Verify error sanitization
            result.errors!.forEach(error => {
              expect(error.field).toBeDefined()
              expect(error.message).toBeDefined()
              expect(error.code).toBeDefined()
              
              // No internal details
              const message = error.message.toLowerCase()
              expect(message).not.toMatch(/database|schema|table|column|sql|query|stack|trace/i)
            })
          })
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Type mismatches should be rejected
   * 
   * Tests that schemas properly reject inputs with wrong types
   * (e.g., number instead of string, string instead of array).
   */
  it('should reject inputs with type mismatches', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          phone_number: fc.oneof(
            fc.integer(), // Number instead of string
            fc.boolean(), // Boolean instead of string
            fc.constant(null), // Null instead of string
            fc.array(fc.string()) // Array instead of string
          ),
          tags: fc.option(fc.oneof(
            fc.string(), // String instead of array
            fc.integer(), // Number instead of array
            fc.constant(null) // Null instead of array
          )),
          metadata: fc.option(fc.oneof(
            fc.string(), // String instead of object
            fc.array(fc.string()), // Array instead of object
            fc.constant(null) // Null instead of object
          ))
        }),
        async (invalidInput) => {
          const result = InputValidator.validate(CreateContactSchema, invalidInput)
          
          // Validation should fail due to type mismatch
          expect(result.success).toBe(false)
          expect(result.data).toBeUndefined()
          
          // Should have error details
          expect(result.errors).toBeDefined()
          expect(result.errors!.length).toBeGreaterThan(0)
          
          // Verify error structure and sanitization
          result.errors!.forEach(error => {
            expect(error.field).toBeDefined()
            expect(error.message).toBeDefined()
            expect(error.code).toBeDefined()
            
            // No internal system details
            const message = error.message.toLowerCase()
            expect(message).not.toMatch(/database|schema|table|column|sql|query|stack|trace|supabase|postgres|redis/i)
          })
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Nested validation errors should include field paths
   * 
   * Tests that validation errors for nested objects include the full
   * field path (e.g., "user.email" instead of just "email").
   */
  it('should provide field paths for nested validation errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          metadata: fc.record({
            nested: fc.record({
              value: fc.oneof(
                fc.integer(), // Wrong type
                fc.constant(null)
              )
            })
          })
        }),
        async (invalidInput) => {
          // Create a schema with nested validation
          const nestedSchema = z.object({
            metadata: z.object({
              nested: z.object({
                value: z.string() // Expect string
              })
            })
          })
          
          const result = InputValidator.validate(nestedSchema, invalidInput)
          
          // Validation should fail
          expect(result.success).toBe(false)
          
          if (result.errors && result.errors.length > 0) {
            // At least one error should have a nested field path
            const hasNestedPath = result.errors.some(error => 
              error.field.includes('.')
            )
            expect(hasNestedPath).toBe(true)
            
            // Verify sanitization
            result.errors.forEach(error => {
              const message = error.message.toLowerCase()
              expect(message).not.toMatch(/database|schema|table|column|sql|query|stack|trace/i)
            })
          }
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Error codes should be consistent and meaningful
   * 
   * Tests that validation errors include error codes that can be used
   * for programmatic error handling.
   */
  it('should provide consistent error codes for validation failures', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          phone_number: fc.string().filter(s => !s.match(/^\+?[1-9]\d{1,14}$/))
        }),
        async (invalidInput) => {
          const result = InputValidator.validate(CreateContactSchema, invalidInput)
          
          // Validation should fail
          expect(result.success).toBe(false)
          
          if (result.errors && result.errors.length > 0) {
            // All errors should have codes
            result.errors.forEach(error => {
              expect(error.code).toBeDefined()
              expect(typeof error.code).toBe('string')
              expect(error.code.length).toBeGreaterThan(0)
            })
          }
        }
      ),
      { numRuns: 2 }
    )
  })
})
