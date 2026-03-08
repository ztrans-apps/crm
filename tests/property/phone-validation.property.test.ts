import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { InputValidator } from '@/lib/middleware/input-validator'
import { CreateContactSchema } from '@/lib/validation/schemas'

/**
 * Property-Based Tests for Phone Number Validation
 * 
 * **Validates: Requirement 1.7**
 * 
 * These tests verify that phone number validation correctly enforces E.164 format:
 * - Valid format: +[country code][number] (e.g., +14155552671)
 * - Must start with + followed by 1-15 digits
 * - First digit after + must be 1-9 (no leading zeros)
 * - Invalid formats are rejected: missing +, starts with 0, contains letters, too short/long
 */

describe('Feature: security-optimization, Property 2: Phone Number Format Validation', () => {
  /**
   * Property Test: Valid E.164 phone numbers should be accepted
   * 
   * This test generates valid E.164 format phone numbers and verifies that:
   * 1. InputValidator.validatePhoneNumber() returns true
   * 2. CreateContactSchema accepts the phone number
   */
  it('should accept valid E.164 format phone numbers', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid E.164 phone numbers
        fc.tuple(
          fc.integer({ min: 1, max: 9 }), // First digit (country code start, 1-9)
          fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 1, maxLength: 14 }) // Remaining digits (1-14 more)
        ).map(([firstDigit, restDigits]) => {
          // With + prefix
          return `+${firstDigit}${restDigits.join('')}`
        }),
        async (validPhone) => {
          // Test InputValidator.validatePhoneNumber()
          const isValid = InputValidator.validatePhoneNumber(validPhone)
          expect(isValid).toBe(true)
          
          // Test CreateContactSchema validation
          const result = InputValidator.validate(CreateContactSchema, {
            phone_number: validPhone
          })
          
          expect(result.success).toBe(true)
          expect(result.data).toBeDefined()
          expect(result.data?.phone_number).toBe(validPhone)
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Phone numbers without + prefix but valid format should be accepted
   * 
   * E.164 format allows optional + prefix
   */
  it('should accept valid phone numbers without + prefix', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid phone numbers without + prefix
        fc.tuple(
          fc.integer({ min: 1, max: 9 }), // First digit (1-9)
          fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 1, maxLength: 14 }) // Remaining digits
        ).map(([firstDigit, restDigits]) => {
          // Without + prefix
          return `${firstDigit}${restDigits.join('')}`
        }),
        async (validPhone) => {
          // Test InputValidator.validatePhoneNumber()
          const isValid = InputValidator.validatePhoneNumber(validPhone)
          expect(isValid).toBe(true)
          
          // Test CreateContactSchema validation
          const result = InputValidator.validate(CreateContactSchema, {
            phone_number: validPhone
          })
          
          expect(result.success).toBe(true)
          expect(result.data).toBeDefined()
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Phone numbers starting with 0 should be rejected
   * 
   * E.164 format requires first digit to be 1-9 (country codes don't start with 0)
   */
  it('should reject phone numbers starting with 0', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate phone numbers starting with 0
        fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 5, maxLength: 14 })
          .map(digits => `+0${digits.join('')}`),
        async (invalidPhone) => {
          // Test InputValidator.validatePhoneNumber()
          const isValid = InputValidator.validatePhoneNumber(invalidPhone)
          expect(isValid).toBe(false)
          
          // Test CreateContactSchema validation
          const result = InputValidator.validate(CreateContactSchema, {
            phone_number: invalidPhone
          })
          
          expect(result.success).toBe(false)
          expect(result.errors).toBeDefined()
          expect(result.errors!.length).toBeGreaterThan(0)
          
          // Should have error for phone_number field
          const phoneError = result.errors!.find(e => e.field === 'phone_number')
          expect(phoneError).toBeDefined()
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Phone numbers with letters should be rejected
   * 
   * E.164 format only allows digits (and optional + prefix)
   */
  it('should reject phone numbers containing letters', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate phone numbers with letters mixed in
        fc.tuple(
          fc.stringMatching(/^[a-zA-Z]+$/), // Letters
          fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 3, maxLength: 10 }) // Some digits
        ).map(([letters, digits]) => {
          // Mix letters and digits
          return `+${digits.slice(0, 2).join('')}${letters}${digits.slice(2).join('')}`
        }),
        async (invalidPhone) => {
          // Test InputValidator.validatePhoneNumber()
          const isValid = InputValidator.validatePhoneNumber(invalidPhone)
          expect(isValid).toBe(false)
          
          // Test CreateContactSchema validation
          const result = InputValidator.validate(CreateContactSchema, {
            phone_number: invalidPhone
          })
          
          expect(result.success).toBe(false)
          expect(result.errors).toBeDefined()
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Phone numbers that are too short should be rejected
   * 
   * E.164 format requires at least 2 digits (country code + at least 1 digit)
   */
  it('should reject phone numbers that are too short', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate phone numbers with only 1 digit
        fc.integer({ min: 1, max: 9 }).map(digit => `+${digit}`),
        async (invalidPhone) => {
          // Test InputValidator.validatePhoneNumber()
          const isValid = InputValidator.validatePhoneNumber(invalidPhone)
          expect(isValid).toBe(false)
          
          // Test CreateContactSchema validation
          const result = InputValidator.validate(CreateContactSchema, {
            phone_number: invalidPhone
          })
          
          expect(result.success).toBe(false)
          expect(result.errors).toBeDefined()
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Phone numbers that are too long should be rejected
   * 
   * E.164 format allows maximum 15 digits after the + prefix
   */
  it('should reject phone numbers that are too long', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate phone numbers with more than 15 digits
        fc.tuple(
          fc.integer({ min: 1, max: 9 }), // First digit
          fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 15, maxLength: 20 }) // Too many digits
        ).map(([firstDigit, restDigits]) => {
          return `+${firstDigit}${restDigits.join('')}`
        }),
        async (invalidPhone) => {
          // Test InputValidator.validatePhoneNumber()
          const isValid = InputValidator.validatePhoneNumber(invalidPhone)
          expect(isValid).toBe(false)
          
          // Test CreateContactSchema validation
          const result = InputValidator.validate(CreateContactSchema, {
            phone_number: invalidPhone
          })
          
          expect(result.success).toBe(false)
          expect(result.errors).toBeDefined()
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Empty or whitespace-only phone numbers should be rejected
   */
  it('should reject empty or whitespace-only phone numbers', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(''),
          fc.constant('   '),
          fc.constant('\t'),
          fc.constant('\n')
        ),
        async (invalidPhone) => {
          // Test InputValidator.validatePhoneNumber()
          const isValid = InputValidator.validatePhoneNumber(invalidPhone)
          expect(isValid).toBe(false)
          
          // Test CreateContactSchema validation
          const result = InputValidator.validate(CreateContactSchema, {
            phone_number: invalidPhone
          })
          
          expect(result.success).toBe(false)
          expect(result.errors).toBeDefined()
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Phone numbers with special characters should be rejected
   * 
   * E.164 format only allows + prefix and digits, no other special characters
   */
  it('should reject phone numbers with special characters', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate phone numbers with special characters
        fc.tuple(
          fc.integer({ min: 1, max: 9 }),
          fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 5, maxLength: 10 }),
          fc.constantFrom('-', ' ', '(', ')', '.', '#', '*')
        ).map(([firstDigit, digits, specialChar]) => {
          // Insert special character in the middle
          const digitStr = digits.join('')
          const midPoint = Math.floor(digitStr.length / 2)
          return `+${firstDigit}${digitStr.slice(0, midPoint)}${specialChar}${digitStr.slice(midPoint)}`
        }),
        async (invalidPhone) => {
          // Test InputValidator.validatePhoneNumber()
          const isValid = InputValidator.validatePhoneNumber(invalidPhone)
          expect(isValid).toBe(false)
          
          // Test CreateContactSchema validation
          const result = InputValidator.validate(CreateContactSchema, {
            phone_number: invalidPhone
          })
          
          expect(result.success).toBe(false)
          expect(result.errors).toBeDefined()
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Phone numbers with multiple + signs should be rejected
   */
  it('should reject phone numbers with multiple + signs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.integer({ min: 1, max: 9 }),
          fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 5, maxLength: 10 })
        ).map(([firstDigit, digits]) => {
          // Add extra + signs
          return `++${firstDigit}${digits.join('')}`
        }),
        async (invalidPhone) => {
          // Test InputValidator.validatePhoneNumber()
          const isValid = InputValidator.validatePhoneNumber(invalidPhone)
          expect(isValid).toBe(false)
          
          // Test CreateContactSchema validation
          const result = InputValidator.validate(CreateContactSchema, {
            phone_number: invalidPhone
          })
          
          expect(result.success).toBe(false)
          expect(result.errors).toBeDefined()
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Common invalid phone number formats should be rejected
   * 
   * Tests various common invalid formats that users might try to submit
   */
  it('should reject common invalid phone number formats', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          '123',                    // Too short
          '0123456789',            // Starts with 0
          '+0123456789',           // Starts with 0 after +
          'abc123',                // Contains letters
          '+1-555-555-5555',       // Contains dashes
          '+1 (555) 555-5555',     // Contains spaces and parentheses
          '(555) 555-5555',        // US format without country code
          '+1.555.555.5555',       // Contains dots
          '+12345678901234567',    // Too long (17 digits)
          '++14155552671',         // Double +
          '+-14155552671',         // + and -
          '+',                     // Just +
          '1234567890123456',      // 16 digits without +
          '+1234567890123456'      // 16 digits with +
        ),
        async (invalidPhone) => {
          // Test InputValidator.validatePhoneNumber()
          const isValid = InputValidator.validatePhoneNumber(invalidPhone)
          expect(isValid).toBe(false)
          
          // Test CreateContactSchema validation
          const result = InputValidator.validate(CreateContactSchema, {
            phone_number: invalidPhone
          })
          
          expect(result.success).toBe(false)
          expect(result.errors).toBeDefined()
          expect(result.errors!.length).toBeGreaterThan(0)
          
          // Should have error for phone_number field
          const phoneError = result.errors!.find(e => e.field === 'phone_number')
          expect(phoneError).toBeDefined()
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Valid international phone numbers from various countries
   * 
   * Tests that valid phone numbers from different countries are accepted
   */
  it('should accept valid international phone numbers', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          '+14155552671',      // USA
          '+442071838750',     // UK
          '+33123456789',      // France
          '+81312345678',      // Japan
          '+861012345678',     // China
          '+61212345678',      // Australia
          '+5511987654321',    // Brazil
          '+919876543210',     // India
          '+27123456789',      // South Africa
          '+971501234567'      // UAE
        ),
        async (validPhone) => {
          // Test InputValidator.validatePhoneNumber()
          const isValid = InputValidator.validatePhoneNumber(validPhone)
          expect(isValid).toBe(true)
          
          // Test CreateContactSchema validation
          const result = InputValidator.validate(CreateContactSchema, {
            phone_number: validPhone
          })
          
          expect(result.success).toBe(true)
          expect(result.data).toBeDefined()
          expect(result.data?.phone_number).toBe(validPhone)
        }
      ),
      { numRuns: 2 }
    )
  })
})
