/**
 * Phone Number Validator - Pure Unit Test
 * No external dependencies
 */

import { describe, it, expect } from 'vitest'

// Pure function to test
function validatePhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '')
  
  // Must be between 10-15 digits
  return cleaned.length >= 10 && cleaned.length <= 15
}

function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  
  // Add + prefix if not present
  if (!phone.startsWith('+')) {
    return `+${cleaned}`
  }
  
  return `+${cleaned}`
}

describe('Phone Number Validator - Pure Unit', () => {
  describe('validatePhoneNumber', () => {
    it('should accept valid Indonesian phone number', () => {
      expect(validatePhoneNumber('+6281234567890')).toBe(true)
      expect(validatePhoneNumber('6281234567890')).toBe(true)
      expect(validatePhoneNumber('081234567890')).toBe(true)
    })

    it('should accept valid international phone numbers', () => {
      expect(validatePhoneNumber('+14155552671')).toBe(true)
      expect(validatePhoneNumber('+447911123456')).toBe(true)
    })

    it('should reject too short numbers', () => {
      expect(validatePhoneNumber('123')).toBe(false)
      expect(validatePhoneNumber('12345')).toBe(false)
    })

    it('should reject too long numbers', () => {
      expect(validatePhoneNumber('1234567890123456')).toBe(false)
    })

    it('should reject non-numeric strings', () => {
      expect(validatePhoneNumber('abc')).toBe(false)
      expect(validatePhoneNumber('test')).toBe(false)
    })

    it('should reject empty or null values', () => {
      expect(validatePhoneNumber('')).toBe(false)
      expect(validatePhoneNumber(null as any)).toBe(false)
      expect(validatePhoneNumber(undefined as any)).toBe(false)
    })

    it('should handle phone numbers with formatting', () => {
      expect(validatePhoneNumber('+62-812-3456-7890')).toBe(true)
      expect(validatePhoneNumber('(081) 234-567-890')).toBe(true)
    })
  })

  describe('formatPhoneNumber', () => {
    it('should add + prefix if missing', () => {
      expect(formatPhoneNumber('6281234567890')).toBe('+6281234567890')
      expect(formatPhoneNumber('081234567890')).toBe('+081234567890')
    })

    it('should keep + prefix if present', () => {
      expect(formatPhoneNumber('+6281234567890')).toBe('+6281234567890')
    })

    it('should remove formatting characters', () => {
      expect(formatPhoneNumber('+62-812-3456-7890')).toBe('+6281234567890')
      expect(formatPhoneNumber('(081) 234-567-890')).toBe('+081234567890')
    })
  })
})
