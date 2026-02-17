/**
 * Broadcast Recipient Validator - Unit Test
 * Tests recipient phone number validation and CSV parsing
 */

import { describe, it, expect } from 'vitest'

// Recipient validation functions
function validatePhoneNumber(phone: string): { valid: boolean; error?: string } {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Phone number is required' }
  }
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '')
  
  // Must start with 62 (Indonesia) and be 10-15 digits
  if (!cleaned.startsWith('62')) {
    return { valid: false, error: 'Phone number must start with 62 (Indonesia)' }
  }
  
  if (cleaned.length < 10 || cleaned.length > 15) {
    return { valid: false, error: 'Phone number must be 10-15 digits' }
  }
  
  return { valid: true }
}

function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '')
  
  // Convert 08xxx to 628xxx
  if (cleaned.startsWith('08')) {
    cleaned = '62' + cleaned.substring(1)
  }
  
  // Remove leading + if present
  if (cleaned.startsWith('62')) {
    return cleaned
  }
  
  return '62' + cleaned
}

function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  values.push(current.trim())
  return values
}

function validateCSVHeader(header: string[]): { valid: boolean; error?: string } {
  if (header.length < 2) {
    return { valid: false, error: 'CSV must have at least 2 columns (name, phone)' }
  }
  
  const requiredColumns = ['contacts_name', 'phone_number']
  const hasRequired = requiredColumns.every(col => 
    header.some(h => h.toLowerCase() === col.toLowerCase())
  )
  
  if (!hasRequired) {
    return { 
      valid: false, 
      error: 'CSV must have contacts_name and phone_number columns' 
    }
  }
  
  return { valid: true }
}

function validateRecipientData(data: {
  name: string
  phone: string
  variables?: Record<string, string>
}): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!data.name || data.name.trim().length === 0) {
    errors.push('Name is required')
  }
  
  const phoneValidation = validatePhoneNumber(data.phone)
  if (!phoneValidation.valid) {
    errors.push(phoneValidation.error!)
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

describe('Broadcast Recipient Validator', () => {
  describe('validatePhoneNumber', () => {
    it('should accept valid Indonesian phone numbers', () => {
      expect(validatePhoneNumber('6281234567890').valid).toBe(true)
      expect(validatePhoneNumber('628123456789').valid).toBe(true)
      expect(validatePhoneNumber('62812345678901').valid).toBe(true)
    })

    it('should accept phone numbers with formatting', () => {
      expect(validatePhoneNumber('62-812-3456-7890').valid).toBe(true)
      expect(validatePhoneNumber('62 812 3456 7890').valid).toBe(true)
      expect(validatePhoneNumber('+62 812 3456 7890').valid).toBe(true)
    })

    it('should reject phone numbers not starting with 62', () => {
      const result = validatePhoneNumber('081234567890')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('must start with 62')
    })

    it('should reject phone numbers that are too short', () => {
      const result = validatePhoneNumber('628123')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('10-15 digits')
    })

    it('should reject phone numbers that are too long', () => {
      const result = validatePhoneNumber('6281234567890123456')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('10-15 digits')
    })

    it('should reject empty or null phone numbers', () => {
      expect(validatePhoneNumber('').valid).toBe(false)
      expect(validatePhoneNumber(null as any).valid).toBe(false)
      expect(validatePhoneNumber(undefined as any).valid).toBe(false)
    })

    it('should reject non-numeric strings', () => {
      const result = validatePhoneNumber('abcdefghij')
      expect(result.valid).toBe(false)
    })
  })

  describe('formatPhoneNumber', () => {
    it('should format Indonesian phone numbers correctly', () => {
      expect(formatPhoneNumber('081234567890')).toBe('6281234567890')
      expect(formatPhoneNumber('6281234567890')).toBe('6281234567890')
      expect(formatPhoneNumber('+6281234567890')).toBe('6281234567890')
    })

    it('should remove formatting characters', () => {
      expect(formatPhoneNumber('62-812-3456-7890')).toBe('6281234567890')
      expect(formatPhoneNumber('62 812 3456 7890')).toBe('6281234567890')
      expect(formatPhoneNumber('(62) 812-3456-7890')).toBe('6281234567890')
    })

    it('should convert 08xxx to 628xxx', () => {
      expect(formatPhoneNumber('081234567890')).toBe('6281234567890')
      expect(formatPhoneNumber('089876543210')).toBe('6289876543210')
    })

    it('should handle already formatted numbers', () => {
      expect(formatPhoneNumber('6281234567890')).toBe('6281234567890')
    })
  })

  describe('parseCSVLine', () => {
    it('should parse simple CSV line', () => {
      const line = 'John Doe,6281234567890'
      expect(parseCSVLine(line)).toEqual(['John Doe', '6281234567890'])
    })

    it('should parse CSV line with multiple columns', () => {
      const line = 'John Doe,6281234567890,Premium,ORD-123'
      expect(parseCSVLine(line)).toEqual(['John Doe', '6281234567890', 'Premium', 'ORD-123'])
    })

    it('should handle quoted values with commas', () => {
      const line = '"Doe, John",6281234567890'
      expect(parseCSVLine(line)).toEqual(['Doe, John', '6281234567890'])
    })

    it('should handle empty values', () => {
      const line = 'John Doe,,Premium'
      expect(parseCSVLine(line)).toEqual(['John Doe', '', 'Premium'])
    })

    it('should trim whitespace', () => {
      const line = ' John Doe , 6281234567890 , Premium '
      expect(parseCSVLine(line)).toEqual(['John Doe', '6281234567890', 'Premium'])
    })

    it('should handle single column', () => {
      const line = 'John Doe'
      expect(parseCSVLine(line)).toEqual(['John Doe'])
    })
  })

  describe('validateCSVHeader', () => {
    it('should accept valid headers', () => {
      const header = ['contacts_name', 'phone_number']
      expect(validateCSVHeader(header).valid).toBe(true)
    })

    it('should accept headers with additional columns', () => {
      const header = ['contacts_name', 'phone_number', 'var1', 'var2']
      expect(validateCSVHeader(header).valid).toBe(true)
    })

    it('should accept case-insensitive headers', () => {
      const header = ['Contacts_Name', 'Phone_Number']
      expect(validateCSVHeader(header).valid).toBe(true)
    })

    it('should reject headers with missing required columns', () => {
      const result = validateCSVHeader(['name', 'phone'])
      expect(result.valid).toBe(false)
      expect(result.error).toContain('contacts_name and phone_number')
    })

    it('should reject headers with only one column', () => {
      const result = validateCSVHeader(['contacts_name'])
      expect(result.valid).toBe(false)
      expect(result.error).toContain('at least 2 columns')
    })

    it('should reject empty headers', () => {
      const result = validateCSVHeader([])
      expect(result.valid).toBe(false)
    })
  })

  describe('validateRecipientData', () => {
    it('should accept valid recipient data', () => {
      const data = {
        name: 'John Doe',
        phone: '6281234567890',
      }
      const result = validateRecipientData(data)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should accept recipient data with variables', () => {
      const data = {
        name: 'John Doe',
        phone: '6281234567890',
        variables: { '1': 'Premium', '2': 'ORD-123' },
      }
      const result = validateRecipientData(data)
      expect(result.valid).toBe(true)
    })

    it('should reject recipient with empty name', () => {
      const data = {
        name: '',
        phone: '6281234567890',
      }
      const result = validateRecipientData(data)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Name is required')
    })

    it('should reject recipient with invalid phone', () => {
      const data = {
        name: 'John Doe',
        phone: '081234567890', // Should start with 62
      }
      const result = validateRecipientData(data)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should collect multiple errors', () => {
      const data = {
        name: '',
        phone: '123',
      }
      const result = validateRecipientData(data)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(2)
    })
  })
})
