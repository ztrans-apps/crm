// Contact service - handles contact business logic
import { BaseService } from './base.service'

export interface ContactMetadata {
  email?: string
  company?: string
  position?: string
  notes?: string
  [key: string]: any
}

export class ContactService extends BaseService {
  /**
   * Get contact by ID
   */
  async getContactById(contactId: string) {
    try {
      this.log('ContactService', 'Getting contact', { contactId })

      const { data, error } = await this.supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single()

      if (error) {
        this.handleError(error, 'ContactService.getContactById')
      }

      return data
    } catch (error) {
      this.handleError(error, 'ContactService.getContactById')
    }
  }

  /**
   * Update contact information
   */
  async updateContact(
    contactId: string,
    name: string,
    metadata?: ContactMetadata
  ) {
    try {
      this.log('ContactService', 'Updating contact', { contactId, name })

      const updateData: any = {
        name,
        updated_at: new Date().toISOString(),
      }

      // Extract email and phone from metadata if provided
      if (metadata) {
        // Store email and mobile_phone in main fields
        if (metadata.email) {
          updateData.email = metadata.email
        }
        if (metadata.mobile_phone) {
          updateData.phone_number = metadata.mobile_phone
        }
        
        // Store everything in metadata
        updateData.metadata = metadata
      }

      // @ts-ignore
      const { data, error } = await this.supabase
        .from('contacts')
        .update(updateData)
        .eq('id', contactId)
        .select()

      if (error) {
        this.handleError(error, 'ContactService.updateContact')
      }

      return data?.[0]
    } catch (error) {
      this.handleError(error, 'ContactService.updateContact')
    }
  }

  /**
   * Update contact metadata only
   */
  async updateContactMetadata(contactId: string, metadata: ContactMetadata) {
    try {
      this.log('ContactService', 'Updating contact metadata', { contactId })

      // Get existing metadata
      const contact = await this.getContactById(contactId)
      const existingMetadata = contact?.metadata || {}

      // Merge with new metadata
      const updatedMetadata = {
        ...existingMetadata,
        ...metadata,
      }

      // @ts-ignore
      const { data, error } = await this.supabase
        .from('contacts')
        .update({
          metadata: updatedMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contactId)
        .select()
        .single()

      if (error) {
        this.handleError(error, 'ContactService.updateContactMetadata')
      }

      return data
    } catch (error) {
      this.handleError(error, 'ContactService.updateContactMetadata')
    }
  }

  /**
   * Search contacts
   */
  async searchContacts(query: string, limit: number = 50) {
    try {
      this.log('ContactService', 'Searching contacts', { query, limit })

      const { data, error } = await this.supabase
        .from('contacts')
        .select('*')
        .or(`name.ilike.%${query}%,phone_number.ilike.%${query}%`)
        .limit(limit)
        .order('name', { ascending: true })

      if (error) {
        this.handleError(error, 'ContactService.searchContacts')
      }

      return data || []
    } catch (error) {
      this.handleError(error, 'ContactService.searchContacts')
    }
  }

  /**
   * Get contact conversations
   */
  async getContactConversations(contactId: string) {
    try {
      this.log('ContactService', 'Getting contact conversations', { contactId })

      const { data, error } = await this.supabase
        .from('conversations')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })

      if (error) {
        this.handleError(error, 'ContactService.getContactConversations')
      }

      return data || []
    } catch (error) {
      this.handleError(error, 'ContactService.getContactConversations')
    }
  }

  /**
   * Get contact statistics
   */
  async getContactStats(contactId: string) {
    try {
      this.log('ContactService', 'Getting contact stats', { contactId })

      const conversations = await this.getContactConversations(contactId)

      return {
        totalConversations: conversations.length,
        openConversations: conversations.filter(c => c.status === 'open').length,
        closedConversations: conversations.filter(c => c.status === 'closed').length,
        lastConversationAt: conversations[0]?.created_at || null,
      }
    } catch (error) {
      this.handleError(error, 'ContactService.getContactStats')
    }
  }

  /**
   * Create new contact
   */
  async createContact(phoneNumber: string, name?: string, metadata?: ContactMetadata) {
    try {
      this.log('ContactService', 'Creating contact', { phoneNumber, name })

      // Validate and sanitize phone number
      const { sanitizePhoneForStorage } = await import('@/lib/utils/phone')
      const cleanPhone = sanitizePhoneForStorage(phoneNumber)
      
      if (!cleanPhone) {
        console.error('[ContactService] Invalid phone number:', phoneNumber)
        throw new Error(`Invalid phone number format: ${phoneNumber}`)
      }
      
      // Log if phone was modified
      if (cleanPhone !== phoneNumber) {
        console.warn('[ContactService] Phone number sanitized:', {
          original: phoneNumber,
          sanitized: cleanPhone
        })
      }

      const contactData: any = {
        phone_number: cleanPhone, // Use sanitized phone
        name: name || null,
        metadata: metadata || {},
        created_at: new Date().toISOString(),
      }

      // @ts-ignore
      const { data, error } = await this.supabase
        .from('contacts')
        .insert(contactData)
        .select()
        .single()

      if (error) {
        this.handleError(error, 'ContactService.createContact')
      }

      return data
    } catch (error) {
      this.handleError(error, 'ContactService.createContact')
    }
  }

  /**
   * Get or create contact by phone number
   */
  async getOrCreateContact(phoneNumber: string, name?: string) {
    try {
      this.log('ContactService', 'Getting or creating contact', { phoneNumber, name })

      // CRITICAL: Validate and sanitize phone number
      const { sanitizePhoneForStorage, isCorruptedPhone } = await import('@/lib/utils/phone')
      
      // Check if phone is corrupted
      if (isCorruptedPhone(phoneNumber)) {
        console.error('[ContactService] CORRUPTED PHONE DETECTED:', {
          phone: phoneNumber,
          length: phoneNumber.length,
          stack: new Error().stack
        })
        throw new Error(`Corrupted phone number detected: ${phoneNumber}`)
      }
      
      // Sanitize phone number
      const cleanPhone = sanitizePhoneForStorage(phoneNumber)
      
      if (!cleanPhone) {
        console.error('[ContactService] Invalid phone number:', {
          original: phoneNumber,
          sanitized: cleanPhone
        })
        throw new Error(`Invalid phone number format: ${phoneNumber}`)
      }
      
      // Log if phone was modified
      if (cleanPhone !== phoneNumber) {
        console.warn('[ContactService] Phone number sanitized:', {
          original: phoneNumber,
          sanitized: cleanPhone
        })
      }

      // Try to find existing contact with CLEAN phone
      const { data: existing, error: findError } = await this.supabase
        .from('contacts')
        .select('*')
        .eq('phone_number', cleanPhone)
        .single()

      if (existing) {
        // Update name if provided and current name is empty
        if (name && (!existing.name || existing.name.trim() === '')) {
          await this.updateContact(existing.id, name, {})
          return { ...existing, name }
        }
        return existing
      }

      // Create new contact if not found with CLEAN phone
      if (findError?.code === 'PGRST116') {
        return await this.createContact(cleanPhone, name)
      }

      if (findError) {
        this.handleError(findError, 'ContactService.getOrCreateContact')
      }

      return existing
    } catch (error) {
      this.handleError(error, 'ContactService.getOrCreateContact')
    }
  }

  /**
   * Update contact name from WhatsApp pushname
   * Only updates if current name is empty
   */
  async updateContactFromWhatsApp(
    phoneNumber: string,
    pushname: string | null
  ) {
    try {
      if (!pushname || pushname.trim() === '') {
        return null
      }

      this.log('ContactService', 'Updating contact from WhatsApp', { 
        phoneNumber, 
        pushname 
      })

      // Find contact by phone number
      const { data: contact, error: findError } = await this.supabase
        .from('contacts')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single()

      if (findError || !contact) {
        return null
      }

      // Only update if name is not already set
      if (!contact.name || contact.name.trim() === '') {
        const { data, error } = await this.supabase
          .from('contacts')
          .update({
            name: pushname,
            updated_at: new Date().toISOString(),
          })
          .eq('id', contact.id)
          .select()

        if (error) {
          this.handleError(error, 'ContactService.updateContactFromWhatsApp')
        }

        return data?.[0]
      }

      return contact
    } catch (error) {
      this.handleError(error, 'ContactService.updateContactFromWhatsApp')
    }
  }
}

// Export singleton instance
export const contactService = new ContactService()
