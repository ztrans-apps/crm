import { describe, it, expect } from 'vitest'
import { InputValidator } from '@/lib/middleware/input-validator'
import { z } from 'zod'

describe('InputValidator', () => {
  describe('validate', () => {
    it('should validate data against a Zod schema successfully', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      })

      const result = InputValidator.validate(schema, {
        name: 'John',
        age: 30
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ name: 'John', age: 30 })
      expect(result.errors).toBeUndefined()
    })

    it('should return validation errors for invalid data', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      })

      const result = InputValidator.validate(schema, {
        name: 'John',
        age: 'invalid'
      })

      expect(result.success).toBe(false)
      expect(result.data).toBeUndefined()
      expect(result.errors).toBeDefined()
      expect(result.errors?.length).toBeGreaterThan(0)
      expect(result.errors?.[0].field).toBe('age')
    })

    it('should handle nested object validation', () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          email: z.string().email()
        })
      })

      const result = InputValidator.validate(schema, {
        user: {
          name: 'John',
          email: 'invalid-email'
        }
      })

      expect(result.success).toBe(false)
      expect(result.errors?.[0].field).toBe('user.email')
    })
  })

  describe('sanitizeString', () => {
    it('should remove SQL injection patterns', () => {
      const malicious = "'; DROP TABLE users; --"
      const sanitized = InputValidator.sanitizeString(malicious)
      
      expect(sanitized).not.toContain('DROP')
      expect(sanitized).not.toContain('--')
    })

    it('should remove UNION SELECT patterns', () => {
      const malicious = "1' UNION SELECT * FROM users--"
      const sanitized = InputValidator.sanitizeString(malicious)
      
      expect(sanitized.toUpperCase()).not.toContain('UNION')
      expect(sanitized.toUpperCase()).not.toContain('SELECT')
    })

    it('should remove path traversal patterns', () => {
      const malicious = '../../../etc/passwd'
      const sanitized = InputValidator.sanitizeString(malicious)
      
      expect(sanitized).not.toContain('../')
    })

    it('should remove XSS script tags', () => {
      const malicious = '<script>alert("XSS")</script>'
      const sanitized = InputValidator.sanitizeString(malicious)
      
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('alert')
    })

    it('should remove javascript: protocol', () => {
      const malicious = 'javascript:alert("XSS")'
      const sanitized = InputValidator.sanitizeString(malicious)
      
      expect(sanitized.toLowerCase()).not.toContain('javascript:')
    })

    it('should remove event handlers', () => {
      const malicious = 'onclick=alert("XSS")'
      const sanitized = InputValidator.sanitizeString(malicious)
      
      expect(sanitized.toLowerCase()).not.toContain('onclick=')
    })

    it('should remove null bytes and control characters', () => {
      const malicious = 'test\x00\x01\x02string'
      const sanitized = InputValidator.sanitizeString(malicious)
      
      expect(sanitized).toBe('teststring')
    })

    it('should handle empty or invalid input', () => {
      expect(InputValidator.sanitizeString('')).toBe('')
      expect(InputValidator.sanitizeString(null as any)).toBe('')
      expect(InputValidator.sanitizeString(undefined as any)).toBe('')
    })

    it('should preserve safe strings', () => {
      const safe = 'Hello, World! This is a safe string.'
      const sanitized = InputValidator.sanitizeString(safe)
      
      expect(sanitized).toBe(safe)
    })
  })

  describe('sanitizeHtml', () => {
    it('should remove script tags and content', () => {
      const malicious = '<p>Hello</p><script>alert("XSS")</script><p>World</p>'
      const sanitized = InputValidator.sanitizeHtml(malicious)
      
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('alert')
      expect(sanitized).toContain('<p>Hello</p>')
    })

    it('should remove style tags', () => {
      const malicious = '<p>Hello</p><style>body { display: none; }</style>'
      const sanitized = InputValidator.sanitizeHtml(malicious)
      
      expect(sanitized).not.toContain('<style>')
      expect(sanitized).toContain('<p>Hello</p>')
    })

    it('should remove dangerous tags', () => {
      const malicious = '<iframe src="evil.com"></iframe><object data="evil.swf"></object>'
      const sanitized = InputValidator.sanitizeHtml(malicious)
      
      expect(sanitized).not.toContain('<iframe>')
      expect(sanitized).not.toContain('<object>')
    })

    it('should remove event handler attributes', () => {
      const malicious = '<p onclick="alert(\'XSS\')">Click me</p>'
      const sanitized = InputValidator.sanitizeHtml(malicious)
      
      expect(sanitized).not.toContain('onclick')
      expect(sanitized).toContain('<p')
      expect(sanitized).toContain('Click me')
    })

    it('should sanitize javascript: protocol in href', () => {
      const malicious = '<a href="javascript:alert(\'XSS\')">Click</a>'
      const sanitized = InputValidator.sanitizeHtml(malicious)
      
      expect(sanitized).not.toContain('javascript:')
      expect(sanitized).toContain('href="#"')
    })

    it('should sanitize data: protocol in src', () => {
      const malicious = '<img src="data:text/html,<script>alert(\'XSS\')</script>">'
      const sanitized = InputValidator.sanitizeHtml(malicious)
      
      expect(sanitized).not.toContain('data:')
      expect(sanitized).toContain('src=""')
    })

    it('should remove style attributes', () => {
      const malicious = '<p style="display:none">Hidden</p>'
      const sanitized = InputValidator.sanitizeHtml(malicious)
      
      expect(sanitized).not.toContain('style=')
      expect(sanitized).toContain('Hidden')
    })

    it('should remove form elements', () => {
      const malicious = '<form><input type="text"><button>Submit</button></form>'
      const sanitized = InputValidator.sanitizeHtml(malicious)
      
      expect(sanitized).not.toContain('<form>')
      expect(sanitized).not.toContain('<input>')
      expect(sanitized).not.toContain('<button>')
    })

    it('should handle empty or invalid input', () => {
      expect(InputValidator.sanitizeHtml('')).toBe('')
      expect(InputValidator.sanitizeHtml(null as any)).toBe('')
      expect(InputValidator.sanitizeHtml(undefined as any)).toBe('')
    })

    it('should preserve safe HTML tags', () => {
      const safe = '<p>Hello <strong>World</strong>!</p><br><em>Test</em>'
      const sanitized = InputValidator.sanitizeHtml(safe)
      
      expect(sanitized).toContain('<p>')
      expect(sanitized).toContain('<strong>')
      expect(sanitized).toContain('<em>')
    })
  })

  describe('validatePhoneNumber', () => {
    it('should validate E.164 format with + prefix', () => {
      expect(InputValidator.validatePhoneNumber('+14155552671')).toBe(true)
      expect(InputValidator.validatePhoneNumber('+442071838750')).toBe(true)
      expect(InputValidator.validatePhoneNumber('+6281234567890')).toBe(true)
    })

    it('should validate E.164 format without + prefix', () => {
      expect(InputValidator.validatePhoneNumber('14155552671')).toBe(true)
      expect(InputValidator.validatePhoneNumber('442071838750')).toBe(true)
    })

    it('should reject invalid phone numbers', () => {
      expect(InputValidator.validatePhoneNumber('1')).toBe(false) // Too short (only 1 digit)
      expect(InputValidator.validatePhoneNumber('0123456789')).toBe(false) // Starts with 0
      expect(InputValidator.validatePhoneNumber('+0123456789')).toBe(false) // Starts with 0
      expect(InputValidator.validatePhoneNumber('abc123456789')).toBe(false) // Contains letters
      expect(InputValidator.validatePhoneNumber('+1-415-555-2671')).toBe(false) // Contains dashes
      expect(InputValidator.validatePhoneNumber('')).toBe(false) // Empty
      expect(InputValidator.validatePhoneNumber('+12345678901234567')).toBe(false) // Too long (>15 digits)
    })

    it('should handle invalid input types', () => {
      expect(InputValidator.validatePhoneNumber(null as any)).toBe(false)
      expect(InputValidator.validatePhoneNumber(undefined as any)).toBe(false)
      expect(InputValidator.validatePhoneNumber(123 as any)).toBe(false)
    })

    it('should trim whitespace before validation', () => {
      expect(InputValidator.validatePhoneNumber('  +14155552671  ')).toBe(true)
    })
  })

  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      expect(InputValidator.validateEmail('test@example.com')).toBe(true)
      expect(InputValidator.validateEmail('user.name@example.co.uk')).toBe(true)
      expect(InputValidator.validateEmail('user+tag@example.com')).toBe(true)
      expect(InputValidator.validateEmail('user_name@example-domain.com')).toBe(true)
    })

    it('should reject invalid email formats', () => {
      expect(InputValidator.validateEmail('invalid')).toBe(false)
      expect(InputValidator.validateEmail('invalid@')).toBe(false)
      expect(InputValidator.validateEmail('@example.com')).toBe(false)
      expect(InputValidator.validateEmail('invalid@example')).toBe(false) // No TLD
      expect(InputValidator.validateEmail('invalid @example.com')).toBe(false) // Space
      expect(InputValidator.validateEmail('')).toBe(false)
    })

    it('should enforce length limits', () => {
      const longLocal = 'a'.repeat(65) + '@example.com'
      expect(InputValidator.validateEmail(longLocal)).toBe(false)
      
      const longDomain = 'test@' + 'a'.repeat(256) + '.com'
      expect(InputValidator.validateEmail(longDomain)).toBe(false)
    })

    it('should require domain with TLD', () => {
      expect(InputValidator.validateEmail('test@localhost')).toBe(false)
      expect(InputValidator.validateEmail('test@example.')).toBe(false)
      expect(InputValidator.validateEmail('test@.com')).toBe(false)
    })

    it('should handle invalid input types', () => {
      expect(InputValidator.validateEmail(null as any)).toBe(false)
      expect(InputValidator.validateEmail(undefined as any)).toBe(false)
      expect(InputValidator.validateEmail(123 as any)).toBe(false)
    })

    it('should trim whitespace before validation', () => {
      expect(InputValidator.validateEmail('  test@example.com  ')).toBe(true)
    })
  })
})
