/**
 * Chatbot Response Builder - Unit Test
 * Tests chatbot response building and variable replacement
 */

import { describe, it, expect } from 'vitest'

// Response building functions
function buildResponse(
  template: string,
  variables: Record<string, string>
): string {
  let response = template
  
  Object.entries(variables).forEach(([key, value]) => {
    // Escape special regex characters in the placeholder
    const placeholder = `{{${key}}}`
    const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    response = response.replace(new RegExp(escapedPlaceholder, 'g'), value)
  })
  
  return response
}

function extractVariablesFromTemplate(template: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g
  const matches = template.matchAll(regex)
  const variables = new Set<string>()
  
  for (const match of matches) {
    variables.add(match[1])
  }
  
  return Array.from(variables)
}

function validateResponseTemplate(template: string): { valid: boolean; error?: string } {
  if (template === null || template === undefined || typeof template !== 'string') {
    return { valid: false, error: 'Template is required' }
  }
  
  const trimmed = template.trim()
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Template cannot be empty' }
  }
  
  if (template.length > 4096) {
    return { valid: false, error: 'Template must not exceed 4096 characters' }
  }
  
  // Check for unclosed brackets
  const openBrackets = (template.match(/\{\{/g) || []).length
  const closeBrackets = (template.match(/\}\}/g) || []).length
  
  if (openBrackets !== closeBrackets) {
    return { valid: false, error: 'Template has unclosed brackets' }
  }
  
  return { valid: true }
}

function addQuickReplyButtons(
  message: string,
  buttons: Array<{ id: string; text: string }>
): { message: string; buttons: Array<{ id: string; text: string }> } {
  return {
    message,
    buttons: buttons.slice(0, 3), // WhatsApp allows max 3 buttons
  }
}

function formatResponseWithNewlines(response: string): string {
  // Convert \n to actual newlines
  return response.replace(/\\n/g, '\n')
}

function sanitizeResponse(response: string): string {
  // Remove potentially harmful content
  let sanitized = response
  
  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  
  // Remove HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '')
  
  // Trim excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim()
  
  return sanitized
}

function buildContextualResponse(
  template: string,
  context: {
    userName?: string
    userPhone?: string
    conversationId?: string
    timestamp?: Date
  }
): string {
  const variables: Record<string, string> = {
    user_name: context.userName || 'Customer',
    user_phone: context.userPhone || '',
    conversation_id: context.conversationId || '',
    timestamp: context.timestamp?.toISOString() || new Date().toISOString(),
    date: context.timestamp?.toLocaleDateString() || new Date().toLocaleDateString(),
    time: context.timestamp?.toLocaleTimeString() || new Date().toLocaleTimeString(),
  }
  
  return buildResponse(template, variables)
}

describe('Chatbot Response Builder', () => {
  describe('buildResponse', () => {
    it('should replace single variable', () => {
      const template = 'Hello {{name}}, welcome!'
      const variables = { name: 'John' }
      
      expect(buildResponse(template, variables)).toBe('Hello John, welcome!')
    })

    it('should replace multiple variables', () => {
      const template = 'Hello {{name}}, your order {{order_id}} is ready'
      const variables = { name: 'John', order_id: 'ORD-123' }
      
      expect(buildResponse(template, variables)).toBe('Hello John, your order ORD-123 is ready')
    })

    it('should replace duplicate variables', () => {
      const template = 'Hello {{name}}, {{name}} is a great name!'
      const variables = { name: 'John' }
      
      expect(buildResponse(template, variables)).toBe('Hello John, John is a great name!')
    })

    it('should handle missing variables', () => {
      const template = 'Hello {{name}}, your order {{order_id}} is ready'
      const variables = { name: 'John' }
      
      const result = buildResponse(template, variables)
      expect(result).toContain('John')
      expect(result).toContain('{{order_id}}')
    })

    it('should handle empty variables object', () => {
      const template = 'Hello {{name}}'
      const variables = {}
      
      expect(buildResponse(template, variables)).toBe('Hello {{name}}')
    })

    it('should handle template without variables', () => {
      const template = 'Hello, welcome to our store!'
      const variables = { name: 'John' }
      
      expect(buildResponse(template, variables)).toBe('Hello, welcome to our store!')
    })
  })

  describe('extractVariablesFromTemplate', () => {
    it('should extract single variable', () => {
      const template = 'Hello {{name}}'
      expect(extractVariablesFromTemplate(template)).toEqual(['name'])
    })

    it('should extract multiple variables', () => {
      const template = 'Hello {{name}}, order {{order_id}} costs {{price}}'
      const variables = extractVariablesFromTemplate(template)
      
      expect(variables).toHaveLength(3)
      expect(variables).toContain('name')
      expect(variables).toContain('order_id')
      expect(variables).toContain('price')
    })

    it('should not duplicate variables', () => {
      const template = 'Hello {{name}}, {{name}} is great'
      expect(extractVariablesFromTemplate(template)).toEqual(['name'])
    })

    it('should return empty array for no variables', () => {
      const template = 'Hello, welcome!'
      expect(extractVariablesFromTemplate(template)).toEqual([])
    })

    it('should handle variables with underscores', () => {
      const template = 'Hello {{user_name}}, order {{order_id}}'
      const variables = extractVariablesFromTemplate(template)
      
      expect(variables).toContain('user_name')
      expect(variables).toContain('order_id')
    })
  })

  describe('validateResponseTemplate', () => {
    it('should accept valid templates', () => {
      expect(validateResponseTemplate('Hello {{name}}').valid).toBe(true)
      expect(validateResponseTemplate('Simple message').valid).toBe(true)
    })

    it('should reject empty templates', () => {
      const result = validateResponseTemplate('')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('cannot be empty')
    })

    it('should reject null or undefined', () => {
      expect(validateResponseTemplate(null as any).valid).toBe(false)
      expect(validateResponseTemplate(undefined as any).valid).toBe(false)
    })

    it('should reject templates that are too long', () => {
      const longTemplate = 'A'.repeat(4097)
      const result = validateResponseTemplate(longTemplate)
      
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not exceed 4096 characters')
    })

    it('should reject templates with unclosed brackets', () => {
      const result = validateResponseTemplate('Hello {{name}')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('unclosed brackets')
    })

    it('should reject templates with mismatched brackets', () => {
      const result = validateResponseTemplate('Hello {{name}} and {{order')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('unclosed brackets')
    })

    it('should accept templates with multiple variables', () => {
      const result = validateResponseTemplate('Hello {{name}}, order {{id}} is {{status}}')
      expect(result.valid).toBe(true)
    })
  })

  describe('addQuickReplyButtons', () => {
    it('should add buttons to message', () => {
      const message = 'How can I help you?'
      const buttons = [
        { id: '1', text: 'Order Status' },
        { id: '2', text: 'Product Info' },
      ]
      
      const result = addQuickReplyButtons(message, buttons)
      
      expect(result.message).toBe(message)
      expect(result.buttons).toHaveLength(2)
    })

    it('should limit to 3 buttons maximum', () => {
      const message = 'Choose an option'
      const buttons = [
        { id: '1', text: 'Option 1' },
        { id: '2', text: 'Option 2' },
        { id: '3', text: 'Option 3' },
        { id: '4', text: 'Option 4' },
      ]
      
      const result = addQuickReplyButtons(message, buttons)
      
      expect(result.buttons).toHaveLength(3)
      expect(result.buttons[0].id).toBe('1')
      expect(result.buttons[2].id).toBe('3')
    })

    it('should handle empty buttons array', () => {
      const message = 'Hello'
      const result = addQuickReplyButtons(message, [])
      
      expect(result.buttons).toHaveLength(0)
    })
  })

  describe('formatResponseWithNewlines', () => {
    it('should convert \\n to actual newlines', () => {
      const response = 'Line 1\\nLine 2\\nLine 3'
      const formatted = formatResponseWithNewlines(response)
      
      expect(formatted).toBe('Line 1\nLine 2\nLine 3')
    })

    it('should handle multiple \\n in sequence', () => {
      const response = 'Line 1\\n\\nLine 2'
      const formatted = formatResponseWithNewlines(response)
      
      expect(formatted).toBe('Line 1\n\nLine 2')
    })

    it('should handle response without \\n', () => {
      const response = 'Single line'
      expect(formatResponseWithNewlines(response)).toBe('Single line')
    })
  })

  describe('sanitizeResponse', () => {
    it('should remove script tags', () => {
      const response = 'Hello <script>alert("xss")</script> world'
      const sanitized = sanitizeResponse(response)
      
      expect(sanitized).toBe('Hello world')
      expect(sanitized).not.toContain('script')
    })

    it('should remove HTML tags', () => {
      const response = 'Hello <b>world</b> <i>test</i>'
      const sanitized = sanitizeResponse(response)
      
      expect(sanitized).toBe('Hello world test')
    })

    it('should trim excessive whitespace', () => {
      const response = 'Hello    world    test'
      const sanitized = sanitizeResponse(response)
      
      expect(sanitized).toBe('Hello world test')
    })

    it('should handle clean responses', () => {
      const response = 'Hello world'
      expect(sanitizeResponse(response)).toBe('Hello world')
    })

    it('should trim leading and trailing whitespace', () => {
      const response = '  Hello world  '
      expect(sanitizeResponse(response)).toBe('Hello world')
    })
  })

  describe('buildContextualResponse', () => {
    it('should build response with user context', () => {
      const template = 'Hello {{user_name}}, your phone is {{user_phone}}'
      const context = {
        userName: 'John Doe',
        userPhone: '6281234567890',
      }
      
      const response = buildContextualResponse(template, context)
      
      expect(response).toContain('John Doe')
      expect(response).toContain('6281234567890')
    })

    it('should use default values for missing context', () => {
      const template = 'Hello {{user_name}}'
      const context = {}
      
      const response = buildContextualResponse(template, context)
      
      expect(response).toContain('Customer')
    })

    it('should include timestamp information', () => {
      const template = 'Date: {{date}}, Time: {{time}}'
      const timestamp = new Date('2024-02-17T10:00:00')
      const context = { timestamp }
      
      const response = buildContextualResponse(template, context)
      
      expect(response).toContain('Date:')
      expect(response).toContain('Time:')
    })

    it('should handle all context variables', () => {
      const template = 'User: {{user_name}}, Phone: {{user_phone}}, Conv: {{conversation_id}}'
      const context = {
        userName: 'John',
        userPhone: '628123456789',
        conversationId: 'conv-123',
      }
      
      const response = buildContextualResponse(template, context)
      
      expect(response).toContain('John')
      expect(response).toContain('628123456789')
      expect(response).toContain('conv-123')
    })
  })
})
