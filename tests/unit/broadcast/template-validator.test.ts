/**
 * Broadcast Template Validator - Unit Test
 * Tests template validation and variable replacement
 */

import { describe, it, expect } from 'vitest'

// Template validation functions
function validateTemplateCategory(category: string): { valid: boolean; error?: string } {
  const validCategories = ['MARKETING', 'UTILITY', 'AUTHENTICATION']
  
  if (!validCategories.includes(category.toUpperCase())) {
    return { 
      valid: false, 
      error: `Invalid category. Must be one of: ${validCategories.join(', ')}` 
    }
  }
  
  return { valid: true }
}

function extractTemplateVariables(content: string): string[] {
  const regex = /\{\{(\d+)\}\}/g
  const matches = content.matchAll(regex)
  const variables = new Set<string>()
  
  for (const match of matches) {
    variables.add(match[1])
  }
  
  return Array.from(variables).sort()
}

function replaceTemplateVariables(
  template: string, 
  variables: Record<string, string>
): string {
  let result = template
  
  Object.entries(variables).forEach(([key, value]) => {
    // Escape special regex characters in the placeholder
    const placeholder = `{{${key}}}`
    const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(escapedPlaceholder, 'g'), value)
  })
  
  return result
}

function validateTemplateContent(content: string): { valid: boolean; error?: string } {
  if (content === null || content === undefined || typeof content !== 'string') {
    return { valid: false, error: 'Template content is required' }
  }
  
  const trimmed = content.trim()
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Template content cannot be empty' }
  }
  
  if (content.length > 4096) {
    return { valid: false, error: 'Template content must not exceed 4096 characters' }
  }
  
  // Check for valid variable format
  const invalidVariables = content.match(/\{\{[^\d\}]+\}\}/g)
  if (invalidVariables) {
    return { 
      valid: false, 
      error: 'Template variables must be numeric (e.g., {{1}}, {{2}})' 
    }
  }
  
  return { valid: true }
}

function countTemplateVariables(content: string): number {
  return extractTemplateVariables(content).length
}

describe('Broadcast Template Validator', () => {
  describe('validateTemplateCategory', () => {
    it('should accept valid WhatsApp categories', () => {
      expect(validateTemplateCategory('MARKETING').valid).toBe(true)
      expect(validateTemplateCategory('UTILITY').valid).toBe(true)
      expect(validateTemplateCategory('AUTHENTICATION').valid).toBe(true)
    })

    it('should accept case-insensitive categories', () => {
      expect(validateTemplateCategory('marketing').valid).toBe(true)
      expect(validateTemplateCategory('Utility').valid).toBe(true)
    })

    it('should reject invalid categories', () => {
      const result = validateTemplateCategory('PROMOTIONAL')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid category')
    })

    it('should reject empty categories', () => {
      const result = validateTemplateCategory('')
      expect(result.valid).toBe(false)
    })
  })

  describe('extractTemplateVariables', () => {
    it('should extract single variable', () => {
      const content = 'Hello {{1}}, welcome!'
      expect(extractTemplateVariables(content)).toEqual(['1'])
    })

    it('should extract multiple variables', () => {
      const content = 'Hello {{1}}, your order {{2}} is ready. Total: {{3}}'
      expect(extractTemplateVariables(content)).toEqual(['1', '2', '3'])
    })

    it('should handle duplicate variables', () => {
      const content = 'Hello {{1}}, {{1}} is your name'
      expect(extractTemplateVariables(content)).toEqual(['1'])
    })

    it('should return empty array for no variables', () => {
      const content = 'Hello, welcome to our store!'
      expect(extractTemplateVariables(content)).toEqual([])
    })

    it('should handle variables in any order', () => {
      const content = 'Order {{3}} for {{1}} costs {{2}}'
      expect(extractTemplateVariables(content)).toEqual(['1', '2', '3'])
    })

    it('should ignore invalid variable formats', () => {
      const content = 'Hello {{name}}, your order {{1}} is ready'
      expect(extractTemplateVariables(content)).toEqual(['1'])
    })
  })

  describe('replaceTemplateVariables', () => {
    it('should replace single variable', () => {
      const template = 'Hello {{1}}, welcome!'
      const variables = { '1': 'John' }
      expect(replaceTemplateVariables(template, variables)).toBe('Hello John, welcome!')
    })

    it('should replace multiple variables', () => {
      const template = 'Hello {{1}}, your order {{2}} costs {{3}}'
      const variables = { '1': 'John', '2': 'ORD-123', '3': '$50' }
      const result = replaceTemplateVariables(template, variables)
      expect(result).toBe('Hello John, your order ORD-123 costs $50')
    })

    it('should replace duplicate variables', () => {
      const template = 'Hello {{1}}, {{1}} is a great name!'
      const variables = { '1': 'John' }
      expect(replaceTemplateVariables(template, variables)).toBe('Hello John, John is a great name!')
    })

    it('should handle missing variables gracefully', () => {
      const template = 'Hello {{1}}, your order {{2}} is ready'
      const variables = { '1': 'John' }
      const result = replaceTemplateVariables(template, variables)
      expect(result).toContain('John')
      expect(result).toContain('{{2}}') // Unreplaced variable remains
    })

    it('should handle empty variables object', () => {
      const template = 'Hello {{1}}, welcome!'
      const variables = {}
      expect(replaceTemplateVariables(template, variables)).toBe('Hello {{1}}, welcome!')
    })

    it('should handle template without variables', () => {
      const template = 'Hello, welcome to our store!'
      const variables = { '1': 'John' }
      expect(replaceTemplateVariables(template, variables)).toBe('Hello, welcome to our store!')
    })
  })

  describe('validateTemplateContent', () => {
    it('should accept valid template content', () => {
      expect(validateTemplateContent('Hello {{1}}, welcome!').valid).toBe(true)
      expect(validateTemplateContent('Simple message').valid).toBe(true)
    })

    it('should reject empty content', () => {
      const result = validateTemplateContent('')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('cannot be empty')
    })

    it('should reject null or undefined', () => {
      expect(validateTemplateContent(null as any).valid).toBe(false)
      expect(validateTemplateContent(undefined as any).valid).toBe(false)
    })

    it('should reject content that is too long', () => {
      const longContent = 'A'.repeat(4097)
      const result = validateTemplateContent(longContent)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not exceed 4096 characters')
    })

    it('should accept content at max length', () => {
      const maxContent = 'A'.repeat(4096)
      expect(validateTemplateContent(maxContent).valid).toBe(true)
    })

    it('should reject invalid variable formats', () => {
      const result = validateTemplateContent('Hello {{name}}, welcome!')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('must be numeric')
    })

    it('should accept numeric variables', () => {
      expect(validateTemplateContent('Hello {{1}}, {{2}}, {{3}}').valid).toBe(true)
    })
  })

  describe('countTemplateVariables', () => {
    it('should count variables correctly', () => {
      expect(countTemplateVariables('Hello {{1}}')).toBe(1)
      expect(countTemplateVariables('Hello {{1}}, {{2}}, {{3}}')).toBe(3)
      expect(countTemplateVariables('No variables here')).toBe(0)
    })

    it('should not count duplicate variables twice', () => {
      expect(countTemplateVariables('Hello {{1}}, {{1}}')).toBe(1)
    })
  })
})
