import { describe, it, expect, beforeEach, vi } from 'vitest'
import fc from 'fast-check'
import { ContactService } from '@/lib/services/contact-service'
import { ContactRepository } from '@/lib/repositories/contact-repository'
import { CreateContactInput, ContactModel } from '@/lib/dto/contact.dto'

/**
 * Property-Based Tests for Business Rule Validation
 * 
 * **Validates: Requirements 4.4**
 * 
 * These tests verify that business rule violations are rejected before database access,
 * ensuring data integrity and preventing invalid operations.
 */

// Mock the repository
vi.mock('@/lib/repositories/contact-repository')

describe('Feature: security-optimization, Property 16: Business Rule Validation', () => {
  let service: ContactService
  let mockRepository: any
  const tenantId = 'test-tenant-id'
  const mockSupabase = {} as any

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ContactService(mockSupabase, tenantId)
    mockRepository = (service as any).repository
  })

  /**
   * Property Test: Duplicate phone number should be rejected before database insert
   * 
   * This test verifies that when attempting to create a contact with a phone number
   * that already exists, the service rejects the operation before calling the database.
   */
  it('should reject duplicate phone numbers before database access', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          phone_number: fc.string().filter(s => /^\+?[1-9]\d{1,14}$/.test(s)),
          email: fc.option(fc.emailAddress()),
        }),
        async (input: CreateContactInput) => {
          // Mock existing contact with same phone number
          const existingContact: ContactModel = {
            id: 'existing-contact-id',
            tenant_id: tenantId,
            name: 'Existing Contact',
            phone_number: input.phone_number,
            email: 'existing@example.com',
            notes: null,
            tags: null,
            avatar_url: null,
            metadata: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          mockRepository.findByPhoneNumber = vi.fn().mockResolvedValue(existingContact)
          mockRepository.create = vi.fn()

          // Attempt to create contact with duplicate phone number
          try {
            await service.createContact(input)
            // Should not reach here
            expect.fail('Expected error to be thrown for duplicate phone number')
          } catch (error: any) {
            // Verify error is thrown
            expect(error.message).toContain('already exists')
            expect(error.message).toContain(input.phone_number)

            // Verify database create was NOT called (business rule prevented it)
            expect(mockRepository.create).not.toHaveBeenCalled()

            // Verify findByPhoneNumber was called to check for duplicate
            expect(mockRepository.findByPhoneNumber).toHaveBeenCalledWith(input.phone_number)
          }
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property Test: Duplicate email should be rejected before database insert
   * 
   * This test verifies that when attempting to create a contact with an email
   * that already exists, the service rejects the operation before calling the database.
   */
  it('should reject duplicate emails before database access', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          phone_number: fc.string().filter(s => /^\+?[1-9]\d{1,14}$/.test(s)),
          email: fc.emailAddress(),
        }),
        async (input: CreateContactInput) => {
          // Mock no duplicate phone but duplicate email
          mockRepository.findByPhoneNumber = vi.fn().mockResolvedValue(null)

          const existingContact: ContactModel = {
            id: 'existing-contact-id',
            tenant_id: tenantId,
            name: 'Existing Contact',
            phone_number: '+14155559999',
            email: input.email,
            notes: null,
            tags: null,
            avatar_url: null,
            metadata: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          mockRepository.findByEmail = vi.fn().mockResolvedValue(existingContact)
          mockRepository.create = vi.fn()

          // Attempt to create contact with duplicate email
          try {
            await service.createContact(input)
            // Should not reach here
            expect.fail('Expected error to be thrown for duplicate email')
          } catch (error: any) {
            // Verify error is thrown
            expect(error.message).toContain('already exists')
            expect(error.message).toContain(input.email!)

            // Verify database create was NOT called (business rule prevented it)
            expect(mockRepository.create).not.toHaveBeenCalled()

            // Verify findByEmail was called to check for duplicate
            expect(mockRepository.findByEmail).toHaveBeenCalledWith(input.email)
          }
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property Test: Valid contacts should pass business rule validation
   * 
   * This test verifies that when creating a contact with unique phone and email,
   * the business rules pass and the database create is called.
   */
  it('should allow valid contacts that pass business rules', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          phone_number: fc.string().filter(s => /^\+?[1-9]\d{1,14}$/.test(s)),
          email: fc.option(fc.emailAddress()),
        }),
        async (input: CreateContactInput) => {
          // Mock no duplicates
          mockRepository.findByPhoneNumber = vi.fn().mockResolvedValue(null)
          mockRepository.findByEmail = vi.fn().mockResolvedValue(null)

          const createdContact: ContactModel = {
            id: 'new-contact-id',
            tenant_id: tenantId,
            name: input.name || null,
            phone_number: input.phone_number,
            email: input.email || null,
            notes: null,
            tags: null,
            avatar_url: null,
            metadata: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          mockRepository.create = vi.fn().mockResolvedValue(createdContact)

          // Create contact
          const result = await service.createContact(input)

          // Verify contact was created
          expect(result).toBeDefined()
          expect(result.phone_number).toBe(input.phone_number)

          // Verify database create WAS called (business rules passed)
          expect(mockRepository.create).toHaveBeenCalled()
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property Test: Update with duplicate email should be rejected
   * 
   * This test verifies that when updating a contact's email to one that already exists,
   * the service rejects the operation before calling the database.
   */
  it('should reject email updates that violate uniqueness constraint', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          contactId: fc.uuid(),
          newEmail: fc.emailAddress(),
        }),
        async ({ contactId, newEmail }) => {
          const existingContact: ContactModel = {
            id: contactId,
            tenant_id: tenantId,
            name: 'Test Contact',
            phone_number: '+14155552671',
            email: 'old@example.com',
            notes: null,
            tags: null,
            avatar_url: null,
            metadata: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          const otherContact: ContactModel = {
            id: 'other-contact-id',
            tenant_id: tenantId,
            name: 'Other Contact',
            phone_number: '+14155552672',
            email: newEmail,
            notes: null,
            tags: null,
            avatar_url: null,
            metadata: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          mockRepository.findById = vi.fn().mockResolvedValue(existingContact)
          mockRepository.findByEmail = vi.fn().mockResolvedValue(otherContact)
          mockRepository.update = vi.fn()

          // Attempt to update email to one that already exists
          try {
            await service.updateContact(contactId, { email: newEmail })
            // Should not reach here
            expect.fail('Expected error to be thrown for duplicate email')
          } catch (error: any) {
            // Verify error is thrown
            expect(error.message).toContain('already exists')
            expect(error.message).toContain(newEmail)

            // Verify database update was NOT called (business rule prevented it)
            expect(mockRepository.update).not.toHaveBeenCalled()
          }
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property Test: Operations on non-existent resources should be rejected
   * 
   * This test verifies that operations on resources that don't exist
   * are rejected before attempting database modifications.
   */
  it('should reject operations on non-existent contacts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          contactId: fc.uuid(),
          updateData: fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
          }),
        }),
        async ({ contactId, updateData }) => {
          // Mock contact not found
          mockRepository.findById = vi.fn().mockResolvedValue(null)
          mockRepository.update = vi.fn()

          // Attempt to update non-existent contact
          try {
            await service.updateContact(contactId, updateData)
            // Should not reach here
            expect.fail('Expected error to be thrown for non-existent contact')
          } catch (error: any) {
            // Verify error is thrown
            expect(error.message).toContain('not found')
            expect(error.message).toContain(contactId)

            // Verify database update was NOT called (business rule prevented it)
            expect(mockRepository.update).not.toHaveBeenCalled()
          }
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property Test: Cross-tenant access should be rejected
   * 
   * This test verifies that operations on resources from different tenants
   * are rejected before database access.
   */
  it('should reject cross-tenant operations before database access', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          contactId: fc.uuid(),
          differentTenantId: fc.uuid().filter(id => id !== tenantId),
          updateData: fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
          }),
        }),
        async ({ contactId, differentTenantId, updateData }) => {
          const differentTenantContact: ContactModel = {
            id: contactId,
            tenant_id: differentTenantId,
            name: 'Test Contact',
            phone_number: '+14155552671',
            email: 'test@example.com',
            notes: null,
            tags: null,
            avatar_url: null,
            metadata: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          mockRepository.findById = vi.fn().mockResolvedValue(differentTenantContact)
          mockRepository.update = vi.fn()

          // Attempt to update contact from different tenant
          try {
            await service.updateContact(contactId, updateData)
            // Should not reach here
            expect.fail('Expected error to be thrown for cross-tenant access')
          } catch (error: any) {
            // Verify error is thrown
            expect(error.message).toContain('Tenant access violation')

            // Verify database update was NOT called (business rule prevented it)
            expect(mockRepository.update).not.toHaveBeenCalled()
          }
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property Test: Merge operations should validate both contacts exist
   * 
   * This test verifies that merge operations validate both source and target
   * contacts exist before attempting database modifications.
   */
  it('should reject merge operations when contacts do not exist', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          sourceId: fc.uuid(),
          targetId: fc.uuid(),
        }).filter(({ sourceId, targetId }) => sourceId !== targetId),
        async ({ sourceId, targetId }) => {
          // Mock source contact not found
          mockRepository.findById = vi.fn().mockResolvedValue(null)
          mockRepository.update = vi.fn()
          mockRepository.delete = vi.fn()

          // Attempt to merge with non-existent source
          try {
            await service.mergeContacts(sourceId, targetId)
            // Should not reach here
            expect.fail('Expected error to be thrown for non-existent source contact')
          } catch (error: any) {
            // Verify error is thrown
            expect(error.message).toContain('not found')

            // Verify database operations were NOT called (business rule prevented it)
            expect(mockRepository.update).not.toHaveBeenCalled()
            expect(mockRepository.delete).not.toHaveBeenCalled()
          }
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property Test: Business rules should be checked in correct order
   * 
   * This test verifies that business rules are checked in the correct order
   * (existence checks before uniqueness checks, etc.)
   */
  it('should check business rules in correct order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          contactId: fc.uuid(),
          newEmail: fc.emailAddress(),
        }),
        async ({ contactId, newEmail }) => {
          // Mock contact not found
          mockRepository.findById = vi.fn().mockResolvedValue(null)
          mockRepository.findByEmail = vi.fn()
          mockRepository.update = vi.fn()

          // Attempt to update non-existent contact
          try {
            await service.updateContact(contactId, { email: newEmail })
            // Should not reach here
            expect.fail('Expected error to be thrown')
          } catch (error: any) {
            // Verify existence check happened first
            expect(mockRepository.findById).toHaveBeenCalled()

            // Verify uniqueness check was NOT called (existence check failed first)
            expect(mockRepository.findByEmail).not.toHaveBeenCalled()

            // Verify database update was NOT called
            expect(mockRepository.update).not.toHaveBeenCalled()
          }
        }
      ),
      { numRuns: 10 }
    )
  })
})
