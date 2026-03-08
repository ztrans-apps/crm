import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ContactService } from '@/lib/services/contact-service'
import { ContactRepository } from '@/lib/repositories/contact-repository'
import { CreateContactInput, UpdateContactInput, ContactModel } from '@/lib/dto/contact.dto'

/**
 * Unit Tests for ContactService
 * 
 * Tests business logic, validation, and error handling.
 * 
 * **Requirements: 4.4, 4.6, 4.7**
 */

// Mock the repository
vi.mock('@/lib/repositories/contact-repository')

describe('ContactService', () => {
  let service: ContactService
  let mockRepository: any
  const tenantId = 'test-tenant-id'
  const mockSupabase = {} as any

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Create service instance
    service = new ContactService(mockSupabase, tenantId)

    // Get the mocked repository instance
    mockRepository = (service as any).repository
  })

  describe('createContact', () => {
    const validInput: CreateContactInput = {
      name: 'John Doe',
      phone_number: '+14155552671',
      email: 'john@example.com',
      notes: 'Test contact',
      tags: ['customer', 'vip'],
    }

    it('should create a contact successfully', async () => {
      // Mock repository methods
      mockRepository.findByPhoneNumber = vi.fn().mockResolvedValue(null)
      mockRepository.findByEmail = vi.fn().mockResolvedValue(null)
      mockRepository.create = vi.fn().mockResolvedValue({
        id: 'contact-1',
        tenant_id: tenantId,
        name: validInput.name,
        phone_number: validInput.phone_number,
        email: validInput.email,
        notes: validInput.notes,
        tags: validInput.tags,
        avatar_url: null,
        metadata: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as ContactModel)

      const result = await service.createContact(validInput)

      expect(result).toBeDefined()
      expect(result.name).toBe(validInput.name)
      expect(result.phone_number).toBe(validInput.phone_number)
      expect(result.email).toBe(validInput.email)
      expect(mockRepository.findByPhoneNumber).toHaveBeenCalledWith(validInput.phone_number)
      expect(mockRepository.findByEmail).toHaveBeenCalledWith(validInput.email)
      expect(mockRepository.create).toHaveBeenCalled()
    })

    it('should reject duplicate phone number', async () => {
      // Mock existing contact with same phone
      mockRepository.findByPhoneNumber = vi.fn().mockResolvedValue({
        id: 'existing-contact',
        phone_number: validInput.phone_number,
      })

      await expect(service.createContact(validInput)).rejects.toThrow(
        `Contact with phone number ${validInput.phone_number} already exists`
      )

      expect(mockRepository.create).not.toHaveBeenCalled()
    })

    it('should reject duplicate email', async () => {
      // Mock no duplicate phone but duplicate email
      mockRepository.findByPhoneNumber = vi.fn().mockResolvedValue(null)
      mockRepository.findByEmail = vi.fn().mockResolvedValue({
        id: 'existing-contact',
        email: validInput.email,
      })

      await expect(service.createContact(validInput)).rejects.toThrow(
        `Contact with email ${validInput.email} already exists`
      )

      expect(mockRepository.create).not.toHaveBeenCalled()
    })

    it('should create contact without email', async () => {
      const inputWithoutEmail = {
        ...validInput,
        email: undefined,
      }

      mockRepository.findByPhoneNumber = vi.fn().mockResolvedValue(null)
      mockRepository.create = vi.fn().mockResolvedValue({
        id: 'contact-1',
        tenant_id: tenantId,
        name: inputWithoutEmail.name,
        phone_number: inputWithoutEmail.phone_number,
        email: null,
        notes: inputWithoutEmail.notes,
        tags: inputWithoutEmail.tags,
        avatar_url: null,
        metadata: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as ContactModel)

      const result = await service.createContact(inputWithoutEmail)

      expect(result).toBeDefined()
      expect(result.email).toBeNull()
      expect(mockRepository.findByEmail).not.toHaveBeenCalled()
    })
  })

  describe('updateContact', () => {
    const contactId = 'contact-1'
    const existingContact: ContactModel = {
      id: contactId,
      tenant_id: tenantId,
      name: 'John Doe',
      phone_number: '+14155552671',
      email: 'john@example.com',
      notes: 'Test contact',
      tags: ['customer'],
      avatar_url: null,
      metadata: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const updateInput: UpdateContactInput = {
      name: 'John Updated',
      notes: 'Updated notes',
    }

    it('should update a contact successfully', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue(existingContact)
      mockRepository.update = vi.fn().mockResolvedValue({
        ...existingContact,
        ...updateInput,
        updated_at: new Date().toISOString(),
      })

      const result = await service.updateContact(contactId, updateInput)

      expect(result).toBeDefined()
      expect(result.name).toBe(updateInput.name)
      expect(result.notes).toBe(updateInput.notes)
      expect(mockRepository.findById).toHaveBeenCalledWith(contactId)
      expect(mockRepository.update).toHaveBeenCalled()
    })

    it('should reject update for non-existent contact', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue(null)

      await expect(service.updateContact(contactId, updateInput)).rejects.toThrow(
        `Contact with ID ${contactId} not found`
      )

      expect(mockRepository.update).not.toHaveBeenCalled()
    })

    it('should reject update for contact from different tenant', async () => {
      const differentTenantContact = {
        ...existingContact,
        tenant_id: 'different-tenant',
      }

      mockRepository.findById = vi.fn().mockResolvedValue(differentTenantContact)

      await expect(service.updateContact(contactId, updateInput)).rejects.toThrow(
        /Tenant access violation/
      )

      expect(mockRepository.update).not.toHaveBeenCalled()
    })

    it('should reject duplicate email when updating', async () => {
      const updateWithEmail: UpdateContactInput = {
        email: 'newemail@example.com',
      }

      mockRepository.findById = vi.fn().mockResolvedValue(existingContact)
      mockRepository.findByEmail = vi.fn().mockResolvedValue({
        id: 'other-contact',
        email: updateWithEmail.email,
      })

      await expect(service.updateContact(contactId, updateWithEmail)).rejects.toThrow(
        `Contact with email ${updateWithEmail.email} already exists`
      )

      expect(mockRepository.update).not.toHaveBeenCalled()
    })

    it('should allow updating email to same value', async () => {
      const updateWithSameEmail: UpdateContactInput = {
        email: existingContact.email,
      }

      mockRepository.findById = vi.fn().mockResolvedValue(existingContact)
      mockRepository.update = vi.fn().mockResolvedValue({
        ...existingContact,
        updated_at: new Date().toISOString(),
      })

      const result = await service.updateContact(contactId, updateWithSameEmail)

      expect(result).toBeDefined()
      expect(mockRepository.findByEmail).not.toHaveBeenCalled()
      expect(mockRepository.update).toHaveBeenCalled()
    })
  })

  describe('getContact', () => {
    const contactId = 'contact-1'
    const existingContact: ContactModel = {
      id: contactId,
      tenant_id: tenantId,
      name: 'John Doe',
      phone_number: '+14155552671',
      email: 'john@example.com',
      notes: 'Test contact',
      tags: ['customer'],
      avatar_url: null,
      metadata: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    it('should get a contact successfully', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue(existingContact)

      const result = await service.getContact(contactId)

      expect(result).toBeDefined()
      expect(result.id).toBe(contactId)
      expect(result.name).toBe(existingContact.name)
      expect(mockRepository.findById).toHaveBeenCalledWith(contactId)
    })

    it('should reject get for non-existent contact', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue(null)

      await expect(service.getContact(contactId)).rejects.toThrow(
        `Contact with ID ${contactId} not found`
      )
    })

    it('should reject get for contact from different tenant', async () => {
      const differentTenantContact = {
        ...existingContact,
        tenant_id: 'different-tenant',
      }

      mockRepository.findById = vi.fn().mockResolvedValue(differentTenantContact)

      await expect(service.getContact(contactId)).rejects.toThrow(
        /Tenant access violation/
      )
    })
  })

  describe('deleteContact', () => {
    const contactId = 'contact-1'
    const existingContact: ContactModel = {
      id: contactId,
      tenant_id: tenantId,
      name: 'John Doe',
      phone_number: '+14155552671',
      email: 'john@example.com',
      notes: 'Test contact',
      tags: ['customer'],
      avatar_url: null,
      metadata: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    it('should delete a contact successfully', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue(existingContact)
      mockRepository.delete = vi.fn().mockResolvedValue(existingContact)

      await service.deleteContact(contactId)

      expect(mockRepository.findById).toHaveBeenCalledWith(contactId)
      expect(mockRepository.delete).toHaveBeenCalledWith(contactId)
    })

    it('should reject delete for non-existent contact', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue(null)

      await expect(service.deleteContact(contactId)).rejects.toThrow(
        `Contact with ID ${contactId} not found`
      )

      expect(mockRepository.delete).not.toHaveBeenCalled()
    })

    it('should reject delete for contact from different tenant', async () => {
      const differentTenantContact = {
        ...existingContact,
        tenant_id: 'different-tenant',
      }

      mockRepository.findById = vi.fn().mockResolvedValue(differentTenantContact)

      await expect(service.deleteContact(contactId)).rejects.toThrow(
        /Tenant access violation/
      )

      expect(mockRepository.delete).not.toHaveBeenCalled()
    })
  })

  describe('mergeContacts', () => {
    const sourceId = 'source-contact'
    const targetId = 'target-contact'

    const sourceContact: ContactModel = {
      id: sourceId,
      tenant_id: tenantId,
      name: 'Source Name',
      phone_number: '+14155552671',
      email: 'source@example.com',
      notes: 'Source notes',
      tags: ['tag1', 'tag2'],
      avatar_url: null,
      metadata: { key1: 'value1' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const targetContact: ContactModel = {
      id: targetId,
      tenant_id: tenantId,
      name: 'Target Name',
      phone_number: '+14155552672',
      email: null,
      notes: 'Target notes',
      tags: ['tag2', 'tag3'],
      avatar_url: null,
      metadata: { key2: 'value2' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    it('should merge contacts successfully', async () => {
      mockRepository.findById = vi
        .fn()
        .mockResolvedValueOnce(sourceContact)
        .mockResolvedValueOnce(targetContact)

      mockRepository.update = vi.fn().mockResolvedValue({
        ...targetContact,
        email: sourceContact.email, // Source email fills target's null email
        tags: ['tag1', 'tag2', 'tag3'], // Combined tags
        updated_at: new Date().toISOString(),
      })

      mockRepository.delete = vi.fn().mockResolvedValue(sourceContact)

      const result = await service.mergeContacts(sourceId, targetId)

      expect(result).toBeDefined()
      expect(result.id).toBe(targetId)
      expect(mockRepository.update).toHaveBeenCalled()
      expect(mockRepository.delete).toHaveBeenCalledWith(sourceId)
    })

    it('should reject merge if source contact not found', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue(null)

      await expect(service.mergeContacts(sourceId, targetId)).rejects.toThrow(
        `Source contact with ID ${sourceId} not found`
      )

      expect(mockRepository.update).not.toHaveBeenCalled()
      expect(mockRepository.delete).not.toHaveBeenCalled()
    })

    it('should reject merge if target contact not found', async () => {
      mockRepository.findById = vi
        .fn()
        .mockResolvedValueOnce(sourceContact)
        .mockResolvedValueOnce(null)

      await expect(service.mergeContacts(sourceId, targetId)).rejects.toThrow(
        `Target contact with ID ${targetId} not found`
      )

      expect(mockRepository.update).not.toHaveBeenCalled()
      expect(mockRepository.delete).not.toHaveBeenCalled()
    })

    it('should reject merge if contacts from different tenants', async () => {
      const differentTenantSource = {
        ...sourceContact,
        tenant_id: 'different-tenant',
      }

      mockRepository.findById = vi
        .fn()
        .mockResolvedValueOnce(differentTenantSource)
        .mockResolvedValueOnce(targetContact)

      await expect(service.mergeContacts(sourceId, targetId)).rejects.toThrow(
        /Tenant access violation/
      )

      expect(mockRepository.update).not.toHaveBeenCalled()
      expect(mockRepository.delete).not.toHaveBeenCalled()
    })
  })

  describe('searchContacts', () => {
    it('should search contacts successfully', async () => {
      const searchQuery = 'john'
      const mockResults = {
        data: [
          {
            id: 'contact-1',
            tenant_id: tenantId,
            name: 'John Doe',
            phone_number: '+14155552671',
            email: 'john@example.com',
            notes: null,
            tags: [],
            avatar_url: null,
            metadata: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ] as ContactModel[],
        total: 1,
        page: 1,
        pageSize: 50,
        hasMore: false,
      }

      mockRepository.search = vi.fn().mockResolvedValue(mockResults)

      const result = await service.searchContacts(searchQuery)

      expect(result).toBeDefined()
      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('John Doe')
      expect(mockRepository.search).toHaveBeenCalledWith(searchQuery, undefined)
    })
  })

  describe('bulkCreateContacts', () => {
    it('should bulk create contacts successfully', async () => {
      const inputs: CreateContactInput[] = [
        {
          name: 'Contact 1',
          phone_number: '+14155552671',
        },
        {
          name: 'Contact 2',
          phone_number: '+14155552672',
        },
      ]

      mockRepository.existsByPhoneNumber = vi.fn().mockResolvedValue(false)
      mockRepository.bulkCreate = vi.fn().mockResolvedValue([
        {
          id: 'contact-1',
          tenant_id: tenantId,
          name: 'Contact 1',
          phone_number: '+14155552671',
          email: null,
          notes: null,
          tags: null,
          avatar_url: null,
          metadata: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'contact-2',
          tenant_id: tenantId,
          name: 'Contact 2',
          phone_number: '+14155552672',
          email: null,
          notes: null,
          tags: null,
          avatar_url: null,
          metadata: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ] as ContactModel[])

      const result = await service.bulkCreateContacts(inputs)

      expect(result).toHaveLength(2)
      expect(mockRepository.bulkCreate).toHaveBeenCalled()
    })

    it('should skip duplicate phone numbers in bulk create', async () => {
      const inputs: CreateContactInput[] = [
        {
          name: 'Contact 1',
          phone_number: '+14155552671',
        },
        {
          name: 'Contact 2',
          phone_number: '+14155552671', // Duplicate
        },
      ]

      mockRepository.existsByPhoneNumber = vi.fn().mockResolvedValue(false)
      mockRepository.bulkCreate = vi.fn().mockResolvedValue([
        {
          id: 'contact-1',
          tenant_id: tenantId,
          name: 'Contact 1',
          phone_number: '+14155552671',
          email: null,
          notes: null,
          tags: null,
          avatar_url: null,
          metadata: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ] as ContactModel[])

      const result = await service.bulkCreateContacts(inputs)

      // Should only create one contact (duplicate filtered out)
      expect(result).toHaveLength(1)
    })

    it('should return empty array if all contacts already exist', async () => {
      const inputs: CreateContactInput[] = [
        {
          name: 'Contact 1',
          phone_number: '+14155552671',
        },
      ]

      mockRepository.existsByPhoneNumber = vi.fn().mockResolvedValue(true)

      const result = await service.bulkCreateContacts(inputs)

      expect(result).toHaveLength(0)
      expect(mockRepository.bulkCreate).not.toHaveBeenCalled()
    })
  })
})
