/**
 * Message Formatter - Pure Unit Test
 * Business logic for message formatting
 */

import { describe, it, expect } from 'vitest'

// Pure functions to test
function truncateMessage(message: string, maxLength: number): string {
  if (message.length <= maxLength) return message
  return message.substring(0, maxLength - 3) + '...'
}

function sanitizeMessage(message: string): string {
  // Remove potentially dangerous characters
  return message
    .replace(/<script>/gi, '')
    .replace(/<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .trim()
}

function extractMentions(message: string): string[] {
  const mentionRegex = /@(\w+)/g
  const mentions: string[] = []
  let match

  while ((match = mentionRegex.exec(message)) !== null) {
    mentions.push(match[1])
  }

  return mentions
}

function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g')
    result = result.replace(regex, value)
  }

  return result
}

describe('Message Formatter - Pure Unit', () => {
  describe('truncateMessage', () => {
    it('should not truncate short messages', () => {
      expect(truncateMessage('Hello', 10)).toBe('Hello')
    })

    it('should truncate long messages', () => {
      expect(truncateMessage('This is a very long message', 10)).toBe('This is...')
    })

    it('should handle exact length', () => {
      expect(truncateMessage('Hello', 5)).toBe('Hello')
    })

    it('should handle empty string', () => {
      expect(truncateMessage('', 10)).toBe('')
    })
  })

  describe('sanitizeMessage', () => {
    it('should remove script tags', () => {
      expect(sanitizeMessage('Hello <script>alert("xss")</script>')).toBe('Hello alert("xss")')
    })

    it('should remove javascript: protocol', () => {
      expect(sanitizeMessage('Click javascript:alert("xss")')).toBe('Click alert("xss")')
    })

    it('should trim whitespace', () => {
      expect(sanitizeMessage('  Hello  ')).toBe('Hello')
    })

    it('should handle clean messages', () => {
      expect(sanitizeMessage('Hello World')).toBe('Hello World')
    })

    it('should be case insensitive for script tags', () => {
      expect(sanitizeMessage('Test <SCRIPT>bad</SCRIPT>')).toBe('Test bad')
    })
  })

  describe('extractMentions', () => {
    it('should extract single mention', () => {
      expect(extractMentions('Hello @john')).toEqual(['john'])
    })

    it('should extract multiple mentions', () => {
      expect(extractMentions('Hello @john and @jane')).toEqual(['john', 'jane'])
    })

    it('should return empty array for no mentions', () => {
      expect(extractMentions('Hello world')).toEqual([])
    })

    it('should handle mentions at start', () => {
      expect(extractMentions('@admin please help')).toEqual(['admin'])
    })

    it('should handle duplicate mentions', () => {
      expect(extractMentions('@john @john @jane')).toEqual(['john', 'john', 'jane'])
    })
  })

  describe('replaceVariables', () => {
    it('should replace single variable', () => {
      const template = 'Hello {{name}}'
      const variables = { name: 'John' }
      expect(replaceVariables(template, variables)).toBe('Hello John')
    })

    it('should replace multiple variables', () => {
      const template = 'Hello {{name}}, your order {{orderId}} is ready'
      const variables = { name: 'John', orderId: '12345' }
      expect(replaceVariables(template, variables)).toBe('Hello John, your order 12345 is ready')
    })

    it('should handle missing variables', () => {
      const template = 'Hello {{name}}'
      const variables = {}
      expect(replaceVariables(template, variables)).toBe('Hello {{name}}')
    })

    it('should handle multiple occurrences', () => {
      const template = '{{name}} {{name}} {{name}}'
      const variables = { name: 'John' }
      expect(replaceVariables(template, variables)).toBe('John John John')
    })

    it('should handle empty template', () => {
      expect(replaceVariables('', { name: 'John' })).toBe('')
    })
  })
})
