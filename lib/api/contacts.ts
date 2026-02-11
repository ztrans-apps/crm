// API functions for contacts management
import { createClient } from '@/lib/supabase/client'

/**
 * Update contact information including custom fields
 */
export async function updateContact(
  contactId: string,
  name: string,
  customFields?: {
    email?: string
    company?: string
    position?: string
    notes?: string
  }
): Promise<void> {
  const supabase = createClient()

  const updateData: any = {
    name,
    updated_at: new Date().toISOString(),
  }

  // Store custom fields in metadata JSON column
  if (customFields) {
    updateData.metadata = customFields
  }

  // @ts-ignore
  const { error } = await supabase
    .from('contacts')
    .update(updateData)
    .eq('id', contactId)

  if (error) {
    console.error('Error updating contact:', error)
    throw new Error(error.message)
  }
}

/**
 * Fetch contact by ID
 */
export async function fetchContactById(contactId: string): Promise<any> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single()

  if (error) {
    console.error('Error fetching contact:', error)
    throw new Error(error.message)
  }

  return data
}
