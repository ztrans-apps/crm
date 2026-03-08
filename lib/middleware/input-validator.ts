import { ZodSchema, ZodError } from 'zod'
import { ValidationResult, ValidationError } from './types'
import { PHONE_NUMBER_REGEX } from '@/lib/validation/schemas'
import { RequestLogger } from './request-logger'

/**
 * InputValidator - Centralized input validation and sanitization utility
 * 
 * Provides methods for:
 * - Schema-based validation using Zod
 * - String sanitization to prevent SQL injection, XSS, and path traversal
 * - HTML sanitization to remove dangerous tags and attributes
 * - Phone number validation (E.164 format)
 * - Email validation
 * - SQL injection detection and logging
 * 
 * Requirements: 1.2, 1.3, 1.4, 1.9, 26.4, 26.7, 26.10, 27.1-27.4, 27.8, 27.9
 */
export class InputValidator {
  /**
   * Validate data against a Zod schema
   * 
   * @param schema - Zod schema to validate against
   * @param data - Data to validate
   * @returns ValidationResult with typed data or errors
   * 
   * Requirements: 1.1, 1.2, 1.3, 1.4
   */
  static validate<T>(
    schema: ZodSchema<T>,
    data: unknown
  ): ValidationResult<T> {
    try {
      const validatedData = schema.parse(data)
      return {
        success: true,
        data: validatedData
      }
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: ValidationError[] = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
        
        return {
          success: false,
          errors
        }
      }
      
      // Unexpected error - return generic validation error
      return {
        success: false,
        errors: [{
          field: 'unknown',
          message: 'Validation failed',
          code: 'VAL_001'
        }]
      }
    }
  }

  /**
   * Get list of detected SQL injection patterns in input
   * 
   * @param input - String to analyze
   * @returns Array of detected pattern names
   * 
   * Requirements: 26.10
   */
  private static getDetectedSqlPatterns(input: string): string[] {
    const patterns: { name: string; regex: RegExp }[] = [
      { name: 'UNION_SELECT', regex: /\bunion\b.*\bselect\b/i },
      { name: 'SELECT_FROM', regex: /\bselect\b.*\bfrom\b/i },
      { name: 'INSERT_INTO', regex: /\binsert\b\s+into\b/i }, // Require whitespace between INSERT and INTO
      { name: 'UPDATE_SET', regex: /\bupdate\b.*\bset\b/i },
      { name: 'DELETE_FROM', regex: /\bdelete\b\s+from\b/i }, // Require whitespace between DELETE and FROM
      { name: 'DROP_TABLE', regex: /\bdrop\b.*\btable\b/i },
      { name: 'EXEC_EXECUTE', regex: /\bexec\b|\bexecute\b/i },
      { name: 'SQL_COMMENT', regex: /(--|\/\*|\*\/)/ }, // Removed # as it's too common in normal text
      { name: 'OR_CONDITION', regex: /(\bor\b\s*['"]?\s*\d+\s*['"]?\s*=\s*['"]?\s*\d+|['"]?\s*\d+\s*['"]?\s*=\s*['"]?\s*\d+\s*\bor\b|'\s*\bor\b\s*')/i }, // OR with numbers or quotes
      { name: 'AND_CONDITION', regex: /(\band\b\s*['"]?\s*\d+\s*['"]?\s*=\s*['"]?\s*\d+|['"]?\s*\d+\s*['"]?\s*=\s*['"]?\s*\d+\s*\band\b|'\s*\band\b\s*')/i }, // AND with numbers or quotes
      { name: 'SEMICOLON_CHAIN', regex: /;.*\b(select|insert|update|delete|drop|exec|execute)\b/i }
    ]

    return patterns
      .filter(({ regex }) => regex.test(input))
      .map(({ name }) => name)
  }

  /**
   * Detect SQL injection patterns in input string
   * 
   * Checks for common SQL injection patterns:
   * - UNION SELECT statements
   * - DROP TABLE statements
   * - SQL comments (double dash, slash-star) - excluding # which is common in normal text
   * - OR/AND conditions with equals and numbers or quotes (e.g., OR 1=1, AND '1'='1', ' OR ')
   * - Semicolon-based query chaining
   * - INSERT INTO / DELETE FROM statements (with required whitespace)
   * - UPDATE/EXEC/EXECUTE statements
   * 
   * @param input - String to check for SQL injection patterns
   * @returns true if SQL injection patterns detected, false otherwise
   * 
   * Requirements: 26.10
   */
  static detectSqlInjection(input: string): boolean {
    if (!input || typeof input !== 'string') {
      return false
    }

    const lowerInput = input.toLowerCase()

    // SQL injection patterns to detect
    const sqlInjectionPatterns = [
      /\bunion\b.*\bselect\b/i,
      /\bselect\b.*\bfrom\b/i,
      /\binsert\b\s+into\b/i, // Require whitespace between INSERT and INTO
      /\bupdate\b.*\bset\b/i,
      /\bdelete\b\s+from\b/i, // Require whitespace between DELETE and FROM
      /\bdrop\b.*\btable\b/i,
      /\bexec\b|\bexecute\b/i,
      /(--|\/\*|\*\/)/,  // SQL comment patterns (excluding # which is too common)
      /(\bor\b\s*['"]?\s*\d+\s*['"]?\s*=\s*['"]?\s*\d+|['"]?\s*\d+\s*['"]?\s*=\s*['"]?\s*\d+\s*\bor\b|'\s*\bor\b\s*')/i, // OR with numbers or quotes
      /(\band\b\s*['"]?\s*\d+\s*['"]?\s*=\s*['"]?\s*\d+|['"]?\s*\d+\s*['"]?\s*=\s*['"]?\s*\d+\s*\band\b|'\s*\band\b\s*')/i, // AND with numbers or quotes
      /;.*\b(select|insert|update|delete|drop|exec|execute)\b/i
    ]

    // Check if any pattern matches
    return sqlInjectionPatterns.some(pattern => pattern.test(input))
  }

  /**
   * Sanitize string input to prevent SQL injection, XSS, and path traversal attacks
   * 
   * Removes or escapes:
   * - SQL injection patterns (UNION, SELECT, DROP, etc.)
   * - XSS patterns (script tags, event handlers, javascript: protocol)
   * - Path traversal patterns (../, ..\, etc.)
   * - Null bytes and control characters
   * 
   * Logs SQL injection attempts as security events for monitoring.
   * 
   * @param input - String to sanitize
   * @param context - Optional context for logging (userId, tenantId, ip)
   * @returns Sanitized string
   * 
   * Requirements: 1.9, 26.4, 26.7, 26.10, 27.1, 27.2, 27.8, 27.9
   */
  static sanitizeString(input: string, context?: { userId?: string; tenantId?: string; ip?: string }): string {
    if (!input || typeof input !== 'string') {
      return ''
    }

    // Detect SQL injection attempts before sanitization
    const hasSqlInjection = this.detectSqlInjection(input)
    
    // Log SQL injection attempts as security events
    if (hasSqlInjection) {
      RequestLogger.logSecurityEvent({
        type: 'suspicious_activity',
        userId: context?.userId,
        tenantId: context?.tenantId,
        ip: context?.ip || 'unknown',
        details: {
          attack_type: 'sql_injection',
          payload: input.substring(0, 200), // Limit payload length in logs
          detected_patterns: this.getDetectedSqlPatterns(input)
        },
        timestamp: new Date().toISOString()
      })
    }

    let sanitized = input

    // Remove null bytes and control characters (except newline, tab, carriage return)
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

    // Remove path traversal patterns
    sanitized = sanitized.replace(/\.\.[\/\\]/g, '')
    sanitized = sanitized.replace(/[\/\\]\.\./g, '')

    // Remove or escape SQL injection patterns (case-insensitive)
    const sqlPatterns = [
      /(\bUNION\b.*\bSELECT\b)/gi,
      /(\bSELECT\b.*\bFROM\b)/gi,
      /(\bINSERT\b.*\bINTO\b)/gi,
      /(\bUPDATE\b.*\bSET\b)/gi,
      /(\bDELETE\b.*\bFROM\b)/gi,
      /(\bDROP\b.*\bTABLE\b)/gi,
      /(\bEXEC\b|\bEXECUTE\b)/gi,
      /(--|\#|\/\*|\*\/)/g, // SQL comment patterns (keeping # for sanitization even though not used in detection)
      /(\bOR\b\s*['"]?\s*\d+\s*['"]?\s*=\s*['"]?\s*\d+)/gi,
      /(\bAND\b\s*['"]?\s*\d+\s*['"]?\s*=\s*['"]?\s*\d+)/gi,
      /(;.*\b(SELECT|INSERT|UPDATE|DELETE|DROP)\b)/gi
    ]

    sqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '')
    })

    // Remove XSS patterns
    // Remove script tags and their content
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    
    // Remove javascript: protocol
    sanitized = sanitized.replace(/javascript:/gi, '')
    
    // Remove on* event handlers (onclick, onerror, etc.)
    sanitized = sanitized.replace(/\bon\w+\s*=/gi, '')
    
    // Remove data: protocol (can be used for XSS)
    sanitized = sanitized.replace(/data:text\/html/gi, '')

    // Trim whitespace
    sanitized = sanitized.trim()

    return sanitized
  }

  /**
   * Sanitize HTML content to remove dangerous tags and attributes
   * 
   * Removes:
   * - Script tags and content
   * - Event handler attributes (onclick, onerror, etc.)
   * - Dangerous protocols (javascript:, data:, vbscript:)
   * - Iframe, object, embed tags
   * - Form tags
   * - Meta tags
   * 
   * Allows safe tags: p, br, strong, em, u, a (with safe href), img (with safe src), 
   * h1-h6, ul, ol, li, blockquote, code, pre
   * 
   * @param input - HTML string to sanitize
   * @returns Sanitized HTML string
   * 
   * Requirements: 27.1, 27.2, 27.3, 27.4, 27.10
   */
  static sanitizeHtml(input: string): string {
    if (!input || typeof input !== 'string') {
      return ''
    }

    let sanitized = input

    // Remove script tags and their content
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    
    // Remove style tags and their content
    sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    
    // Remove dangerous tags
    const dangerousTags = [
      'iframe', 'object', 'embed', 'applet', 'meta', 'link', 
      'form', 'input', 'button', 'textarea', 'select', 'option',
      'base', 'frame', 'frameset'
    ]
    
    dangerousTags.forEach(tag => {
      const regex = new RegExp(`<${tag}\\b[^>]*>.*?<\\/${tag}>`, 'gi')
      sanitized = sanitized.replace(regex, '')
      // Also remove self-closing tags
      const selfClosingRegex = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi')
      sanitized = sanitized.replace(selfClosingRegex, '')
    })

    // Remove event handler attributes
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '')

    // Remove dangerous protocols from href and src attributes
    sanitized = sanitized.replace(/href\s*=\s*["']?\s*javascript:/gi, 'href="#"')
    sanitized = sanitized.replace(/href\s*=\s*["']?\s*data:/gi, 'href="#"')
    sanitized = sanitized.replace(/href\s*=\s*["']?\s*vbscript:/gi, 'href="#"')
    sanitized = sanitized.replace(/src\s*=\s*["']?\s*javascript:/gi, 'src=""')
    sanitized = sanitized.replace(/src\s*=\s*["']?\s*data:/gi, 'src=""')
    sanitized = sanitized.replace(/src\s*=\s*["']?\s*vbscript:/gi, 'src=""')

    // Remove style attributes (can contain expressions)
    sanitized = sanitized.replace(/\s*style\s*=\s*["'][^"']*["']/gi, '')

    return sanitized
  }

  /**
   * Validate phone number format (E.164 international format)
   * 
   * Valid formats:
   * - +14155552671 (with + prefix)
   * - 14155552671 (without + prefix)
   * - Must start with country code (1-9)
   * - Total length: 1-15 digits after country code
   * 
   * @param phone - Phone number to validate
   * @returns true if valid E.164 format, false otherwise
   * 
   * Requirements: 1.7
   */
  static validatePhoneNumber(phone: string): boolean {
    if (!phone || typeof phone !== 'string') {
      return false
    }

    return PHONE_NUMBER_REGEX.test(phone.trim())
  }

  /**
   * Validate email address format
   * 
   * Checks for:
   * - Valid email structure (local@domain.tld)
   * - No whitespace
   * - Valid characters in local and domain parts
   * - At least one dot in domain
   * 
   * @param email - Email address to validate
   * @returns true if valid email format, false otherwise
   * 
   * Requirements: 1.7
   */
  static validateEmail(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false
    }

    // Basic email regex that matches most valid emails
    // More permissive than strict RFC 5322 but catches common issues
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    const trimmed = email.trim()
    
    // Check basic format
    if (!emailRegex.test(trimmed)) {
      return false
    }

    // Additional checks
    const [local, domain] = trimmed.split('@')
    
    // Local part should not be empty and should be reasonable length
    if (!local || local.length > 64) {
      return false
    }
    
    // Domain should not be empty and should be reasonable length
    if (!domain || domain.length > 255) {
      return false
    }
    
    // Domain should have at least one dot
    if (!domain.includes('.')) {
      return false
    }
    
    // Domain parts should not be empty
    const domainParts = domain.split('.')
    if (domainParts.some(part => part.length === 0)) {
      return false
    }

    return true
  }
}
