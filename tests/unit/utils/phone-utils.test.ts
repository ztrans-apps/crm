/**
 * Phone Utils - Unit Test
 * Tests phone number validation, formatting, and sanitization
 */

import { describe, it, expect } from 'vitest'
import {
  extractPhoneFromJID,
  isValidIndonesianPhone,
  normalizeIndonesianPhone,
  formatPhoneForDisplay,
  validateAndCleanPhone,
  isCorruptedPhone,
  fixCorruptedPhone,
  sanitizePhoneForStorage,
} from '@/lib/utils/phone'

describe('Phone Utils', () => {
  describe('extractPhoneFromJID', () => {
    it('should extract phone from WhatsApp JID', () => {
      expect(extractPhoneFromJID('6285722839336@s.whatsapp.net')).toBe('+6285722839336')
      expect(extractPhoneFromJID('628123456789@s.whatsapp.net')).toBe('+628123456789')
    })

    it('should handle group JID', () => {
      expect(extractPhoneFromJID('123456789@g.us')).toBe('+123456789')
    })

    it('should add + prefix if not present', () => {
      expect(extractPhoneFromJID('6285722839336@s.whatsapp.net')).toBe('+6285722839336')
    })

    it('should handle empty or invalid JID', () => {
      expect(extractPhoneFromJID('')).toBe('')
      expect(extractPhoneFromJID(null as any)).toBe('')
    })

    it('should handle JID without @ symbol', () => {
      expect(extractPhoneFromJID('6285722839336')).toBe('+6285722839336')
    })
  })

  describe('isValidIndonesianPhone', () => {
    it('should accept valid Indonesian phone numbers', () => {
      expect(isValidIndonesianPhone('081234567890')).toBe(true)
      expect(isValidIndonesianPhone('6281234567890')).toBe(true)
      expect(isValidIndonesianPhone('+6281234567890')).toBe(true)
    })

    it('should accept different Indonesian operators', () => {
      expect(isValidIndonesianPhone('081234567890')).toBe(true) // Telkomsel
      expect(isValidIndonesianPhone('085234567890')).toBe(true) // Indosat
      expect(isValidIndonesianPhone('089234567890')).toBe(true) // Tri
    })

    it('should accept phone numbers with formatting', () => {
      expect(isValidIndonesianPhone('0812-3456-7890')).toBe(true)
      expect(isValidIndonesianPhone('+62 812 3456 7890')).toBe(true)
    })

    it('should reject invalid phone numbers', () => {
      expect(isValidIndonesianPhone('123')).toBe(false)
      expect(isValidIndonesianPhone('abc')).toBe(false)
      expect(isValidIndonesianPhone('')).toBe(false)
    })

    it('should reject non-Indonesian numbers', () => {
      expect(isValidIndonesianPhone('+14155552671')).toBe(false) // US number
      expect(isValidIndonesianPhone('+447911123456')).toBe(false) // UK number
    })

    it('should reject numbers that are too short', () => {
      expect(isValidIndonesianPhone('0812345')).toBe(false)
    })

    it('should reject numbers that are too long', () => {
      expect(isValidIndonesianPhone('081234567890123456')).toBe(false)
    })
  })

  describe('normalizeIndonesianPhone', () => {
    it('should normalize 08xxx to +628xxx', () => {
      expect(normalizeIndonesianPhone('081234567890')).toBe('+6281234567890')
      expect(normalizeIndonesianPhone('089876543210')).toBe('+6289876543210')
    })

    it('should normalize 628xxx to +628xxx', () => {
      expect(normalizeIndonesianPhone('6281234567890')).toBe('+6281234567890')
    })

    it('should keep +628xxx as is', () => {
      expect(normalizeIndonesianPhone('+6281234567890')).toBe('+6281234567890')
    })

    it('should remove formatting characters', () => {
      expect(normalizeIndonesianPhone('0812-3456-7890')).toBe('+6281234567890')
      expect(normalizeIndonesianPhone('62 812 3456 7890')).toBe('+6281234567890')
    })

    it('should handle empty input', () => {
      expect(normalizeIndonesianPhone('')).toBe('')
      expect(normalizeIndonesianPhone(null as any)).toBe('')
    })

    it('should add 62 prefix if missing', () => {
      expect(normalizeIndonesianPhone('81234567890')).toBe('+6281234567890')
    })
  })

  describe('formatPhoneForDisplay', () => {
    it('should format Indonesian phone for display', () => {
      const formatted = formatPhoneForDisplay('+6285722839336')
      expect(formatted).toContain('+62')
      expect(formatted).toContain('857')
    })

    it('should handle different input formats', () => {
      expect(formatPhoneForDisplay('081234567890')).toContain('+62')
      expect(formatPhoneForDisplay('6281234567890')).toContain('+62')
      expect(formatPhoneForDisplay('+6281234567890')).toContain('+62')
    })

    it('should handle empty input', () => {
      expect(formatPhoneForDisplay('')).toBe('')
    })
  })

  describe('validateAndCleanPhone', () => {
    it('should validate and clean valid phone numbers', () => {
      expect(validateAndCleanPhone('081234567890')).toBe('+6281234567890')
      expect(validateAndCleanPhone('6281234567890')).toBe('+6281234567890')
    })

    it('should extract from JID and validate', () => {
      expect(validateAndCleanPhone('6281234567890@s.whatsapp.net')).toBe('+6281234567890')
    })

    it('should return null for invalid numbers', () => {
      expect(validateAndCleanPhone('123')).toBeNull()
      expect(validateAndCleanPhone('abc')).toBeNull()
    })

    it('should return null for empty input', () => {
      expect(validateAndCleanPhone('')).toBeNull()
      expect(validateAndCleanPhone(null as any)).toBeNull()
    })
  })

  describe('isCorruptedPhone', () => {
    it('should detect corrupted phone numbers', () => {
      expect(isCorruptedPhone('12345678901234567890')).toBe(true) // Too long
      expect(isCorruptedPhone('123')).toBe(true) // Too short
      expect(isCorruptedPhone('123123123123')).toBe(true) // Repeated pattern
    })

    it('should accept valid phone numbers', () => {
      expect(isCorruptedPhone('+6281234567890')).toBe(false)
      expect(isCorruptedPhone('081234567890')).toBe(false)
    })

    it('should detect invalid country code', () => {
      expect(isCorruptedPhone('621234567890')).toBe(true) // Should be 628xxx
    })

    it('should return true for empty input', () => {
      expect(isCorruptedPhone('')).toBe(true)
      expect(isCorruptedPhone(null as any)).toBe(true)
    })
  })

  describe('fixCorruptedPhone', () => {
    it('should fix corrupted phone with valid pattern', () => {
      const fixed = fixCorruptedPhone('xxx6281234567890xxx')
      expect(fixed).toBe('+6281234567890')
    })

    it('should fix phone starting with 08', () => {
      const fixed = fixCorruptedPhone('xxx081234567890xxx')
      expect(fixed).toBe('+6281234567890')
    })

    it('should return null for unfixable numbers', () => {
      expect(fixCorruptedPhone('abcdefghijk')).toBeNull()
      expect(fixCorruptedPhone('123')).toBeNull()
    })

    it('should return null for empty input', () => {
      expect(fixCorruptedPhone('')).toBeNull()
      expect(fixCorruptedPhone(null as any)).toBeNull()
    })
  })

  describe('sanitizePhoneForStorage', () => {
    it('should sanitize valid phone numbers', () => {
      expect(sanitizePhoneForStorage('081234567890')).toBe('+6281234567890')
      expect(sanitizePhoneForStorage('6281234567890')).toBe('+6281234567890')
    })

    it('should fix corrupted phone numbers', () => {
      const sanitized = sanitizePhoneForStorage('xxx6281234567890xxx')
      expect(sanitized).toBe('+6281234567890')
    })

    it('should return null for unfixable numbers', () => {
      expect(sanitizePhoneForStorage('abc')).toBeNull()
      expect(sanitizePhoneForStorage('123')).toBeNull()
    })

    it('should return null for empty input', () => {
      expect(sanitizePhoneForStorage('')).toBeNull()
    })

    it('should handle JID format', () => {
      expect(sanitizePhoneForStorage('6281234567890@s.whatsapp.net')).toBe('+6281234567890')
    })
  })
})
