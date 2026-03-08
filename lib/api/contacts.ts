// API functions for contacts management
import type { ContactOutput, UpdateContactInput, CreateContactInput } from '@/lib/dto/contact.dto'
import type { ErrorResponse } from '@/lib/middleware/error-handler'

/**
 * API response wrapper for better error handling
 */
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ErrorResponse
}

/**
 * Fetch contacts with optional search and pagination
 */
export async function fetchContacts(params?: {
  search?: string
  page?: number
  pageSize?: number
}): Promise<ApiResponse<{ contacts: ContactOutput[]; pagination: any }>> {
  try {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.set('search', params.search)
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString())

    const response = await fetch(`/api/contacts?${searchParams.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      const error: ErrorResponse = await response.json()
      return { success: false, error }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return {
      success: false,
      error: {
        error: 'NetworkError',
        message: 'Failed to fetch contacts',
        code: 'NETWORK_ERROR',
        requestId: '',
        timestamp: new Date().toISOString(),
      },
    }
  }
}

/**
 * Fetch contact by ID
 */
export async function fetchContactById(contactId: string): Promise<ApiResponse<{ contact: ContactOutput }>> {
  try {
    const response = await fetch(`/api/contacts/${contactId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      const error: ErrorResponse = await response.json()
      return { success: false, error }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Error fetching contact:', error)
    return {
      success: false,
      error: {
        error: 'NetworkError',
        message: 'Failed to fetch contact',
        code: 'NETWORK_ERROR',
        requestId: '',
        timestamp: new Date().toISOString(),
      },
    }
  }
}

/**
 * Create a new contact
 */
export async function createContact(input: CreateContactInput): Promise<ApiResponse<{ contact: ContactOutput }>> {
  try {
    const response = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error: ErrorResponse = await response.json()
      return { success: false, error }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Error creating contact:', error)
    return {
      success: false,
      error: {
        error: 'NetworkError',
        message: 'Failed to create contact',
        code: 'NETWORK_ERROR',
        requestId: '',
        timestamp: new Date().toISOString(),
      },
    }
  }
}

/**
 * Update contact information including custom fields
 */
export async function updateContact(
  contactId: string,
  input: UpdateContactInput
): Promise<ApiResponse<{ contact: ContactOutput }>> {
  try {
    const response = await fetch(`/api/contacts/${contactId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error: ErrorResponse = await response.json()
      return { success: false, error }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Error updating contact:', error)
    return {
      success: false,
      error: {
        error: 'NetworkError',
        message: 'Failed to update contact',
        code: 'NETWORK_ERROR',
        requestId: '',
        timestamp: new Date().toISOString(),
      },
    }
  }
}

/**
 * Delete a contact
 */
export async function deleteContact(contactId: string): Promise<ApiResponse<void>> {
  try {
    const response = await fetch(`/api/contacts/${contactId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      const error: ErrorResponse = await response.json()
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting contact:', error)
    return {
      success: false,
      error: {
        error: 'NetworkError',
        message: 'Failed to delete contact',
        code: 'NETWORK_ERROR',
        requestId: '',
        timestamp: new Date().toISOString(),
      },
    }
  }
}
