/**
 * Quick Reply Validator - Unit Test
 * Tests quick reply validation and formatting
 */

import { describe, it, expect } from 'vitest'

// Quick reply validation functions
function validateQuickReplyShortcut(shortcut: string): { valid: boolean; error?: string } {
  if (!shortcut || typeof shortcut !== 'string') {
    return { valid: false, error: 'Shortcut is required' }
  }
  
  if (shortcut.length < 2) {
    return { valid: false, error: 'Shortcut must be at least 2 characters' }
  }
  
  if (shortcut.length > 20) {
    return { valid: false, error: 'Shortcut must not exceed 20 characters' }
  }
  
  // Only allow alphanumeric and underscore
  if (!/^[a-zA-Z0-9_]+$/.test(shortcut)) {
    return { valid: false, error: 'Shortcut can only contain letters, numbers, and underscores' }
  }
  
  return { valid: true }
}

function validateQuickReplyMessage(message: string): { valid: boolean; error?: string } {
  if (message === null || message === undefined || typeof message !== 'string') {
    return { valid: false, error: 'Message is required' }
  }
  
  const trimmed = message.trim()
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Message cannot be empty' }
  }
  
  if (message.length > 4096) {
    return { valid: false, error: 'Message must not exceed 4096 characters' }
  }
  
  return { valid: true }
}

function formatQuickReplyMessage(message: string): string {
  // Convert \n to actual newlines
  return message.replace(/\\n/g, '\n')
}

function searchQuickReplies(
  replies: Array<{ shortcut: string; message: string; category: string }>,
  query: string
): Array<{ shortcut: string; message: string; category: string }> {
  const lowerQuery = query.toLowerCase().trim()
  
  if (!lowerQuery) {
    return replies
  }
  
  return replies.filter(reply => {
    return (
      reply.shortcut.toLowerCase().includes(lowerQuery) ||
      reply.message.toLowerCase().includes(lowerQuery) ||
      reply.category.toLowerCase().includes(lowerQuery)
    )
  })
}

function filterByCategory(
  replies: Array<{ shortcut: string; message: string; category: string }>,
  category: string
): Array<{ shortcut: string; message: string; category: string }> {
  if (!category || category === 'all') {
    return replies
  }
  
  return replies.filter(reply => reply.category === category)
}

function sortQuickReplies(
  replies: Array<{ shortcut: string; usage_count: number; created_at: Date }>,
  sortBy: 'usage' | 'recent' | 'alphabetical'
): Array<{ shortcut: string; usage_count: number; created_at: Date }> {
  const sorted = [...replies]
  
  switch (sortBy) {
    case 'usage':
      return sorted.sort((a, b) => b.usage_count - a.usage_count)
    case 'recent':
      return sorted.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
    case 'alphabetical':
      return sorted.sort((a, b) => a.shortcut.localeCompare(b.shortcut))
    default:
      return sorted
  }
}

function incrementUsageCount(currentCount: number): number {
  return currentCount + 1
}

function getPopularQuickReplies(
  replies: Array<{ shortcut: string; usage_count: number }>,
  limit: number = 5
): Array<{ shortcut: string; usage_count: number }> {
  return replies
    .sort((a, b) => b.usage_count - a.usage_count)
    .slice(0, limit)
}

describe('Quick Reply Validator', () => {
  describe('validateQuickReplyShortcut', () => {
    it('should accept valid shortcuts', () => {
      expect(validateQuickReplyShortcut('hello').valid).toBe(true)
      expect(validateQuickReplyShortcut('greeting_1').valid).toBe(true)
      expect(validateQuickReplyShortcut('ORDER_STATUS').valid).toBe(true)
    })

    it('should reject shortcuts that are too short', () => {
      const result = validateQuickReplyShortcut('a')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('at least 2 characters')
    })

    it('should reject shortcuts that are too long', () => {
      const result = validateQuickReplyShortcut('a'.repeat(21))
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not exceed 20 characters')
    })

    it('should reject shortcuts with special characters', () => {
      expect(validateQuickReplyShortcut('hello-world').valid).toBe(false)
      expect(validateQuickReplyShortcut('hello world').valid).toBe(false)
      expect(validateQuickReplyShortcut('hello@world').valid).toBe(false)
    })

    it('should accept shortcuts with underscores', () => {
      expect(validateQuickReplyShortcut('hello_world').valid).toBe(true)
      expect(validateQuickReplyShortcut('order_status_1').valid).toBe(true)
    })

    it('should reject empty shortcuts', () => {
      const result = validateQuickReplyShortcut('')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should accept mixed case shortcuts', () => {
      expect(validateQuickReplyShortcut('HelloWorld').valid).toBe(true)
      expect(validateQuickReplyShortcut('Order123').valid).toBe(true)
    })
  })

  describe('validateQuickReplyMessage', () => {
    it('should accept valid messages', () => {
      expect(validateQuickReplyMessage('Hello, how can I help you?').valid).toBe(true)
      expect(validateQuickReplyMessage('Order status: {{order_id}}').valid).toBe(true)
    })

    it('should reject empty messages', () => {
      const result = validateQuickReplyMessage('')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('cannot be empty')
    })

    it('should reject messages that are too long', () => {
      const longMessage = 'A'.repeat(4097)
      const result = validateQuickReplyMessage(longMessage)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not exceed 4096 characters')
    })

    it('should accept messages at max length', () => {
      const maxMessage = 'A'.repeat(4096)
      expect(validateQuickReplyMessage(maxMessage).valid).toBe(true)
    })

    it('should reject null or undefined', () => {
      expect(validateQuickReplyMessage(null as any).valid).toBe(false)
      expect(validateQuickReplyMessage(undefined as any).valid).toBe(false)
    })

    it('should accept messages with newlines', () => {
      expect(validateQuickReplyMessage('Line 1\\nLine 2').valid).toBe(true)
    })
  })

  describe('formatQuickReplyMessage', () => {
    it('should convert \\n to actual newlines', () => {
      const message = 'Line 1\\nLine 2\\nLine 3'
      const formatted = formatQuickReplyMessage(message)
      expect(formatted).toBe('Line 1\nLine 2\nLine 3')
    })

    it('should handle multiple \\n in sequence', () => {
      const message = 'Line 1\\n\\nLine 2'
      const formatted = formatQuickReplyMessage(message)
      expect(formatted).toBe('Line 1\n\nLine 2')
    })

    it('should handle messages without \\n', () => {
      const message = 'Single line message'
      expect(formatQuickReplyMessage(message)).toBe('Single line message')
    })

    it('should preserve other content', () => {
      const message = 'Hello {{name}}\\nWelcome!'
      const formatted = formatQuickReplyMessage(message)
      expect(formatted).toBe('Hello {{name}}\nWelcome!')
    })
  })

  describe('searchQuickReplies', () => {
    const replies = [
      { shortcut: 'hello', message: 'Hello, how can I help?', category: 'greeting' },
      { shortcut: 'order', message: 'Check your order status', category: 'support' },
      { shortcut: 'thanks', message: 'Thank you for contacting us', category: 'greeting' },
    ]

    it('should search by shortcut', () => {
      const results = searchQuickReplies(replies, 'hello')
      expect(results).toHaveLength(1)
      expect(results[0].shortcut).toBe('hello')
    })

    it('should search by message content', () => {
      const results = searchQuickReplies(replies, 'order status')
      expect(results).toHaveLength(1)
      expect(results[0].shortcut).toBe('order')
    })

    it('should search by category', () => {
      const results = searchQuickReplies(replies, 'greeting')
      expect(results).toHaveLength(2)
    })

    it('should be case-insensitive', () => {
      const results = searchQuickReplies(replies, 'HELLO')
      expect(results).toHaveLength(1)
    })

    it('should return all replies for empty query', () => {
      const results = searchQuickReplies(replies, '')
      expect(results).toHaveLength(3)
    })

    it('should return empty array for no matches', () => {
      const results = searchQuickReplies(replies, 'nonexistent')
      expect(results).toHaveLength(0)
    })
  })

  describe('filterByCategory', () => {
    const replies = [
      { shortcut: 'hello', message: 'Hello', category: 'greeting' },
      { shortcut: 'order', message: 'Order', category: 'support' },
      { shortcut: 'thanks', message: 'Thanks', category: 'greeting' },
    ]

    it('should filter by category', () => {
      const results = filterByCategory(replies, 'greeting')
      expect(results).toHaveLength(2)
      results.forEach(r => expect(r.category).toBe('greeting'))
    })

    it('should return all for "all" category', () => {
      const results = filterByCategory(replies, 'all')
      expect(results).toHaveLength(3)
    })

    it('should return all for empty category', () => {
      const results = filterByCategory(replies, '')
      expect(results).toHaveLength(3)
    })

    it('should return empty array for non-existent category', () => {
      const results = filterByCategory(replies, 'nonexistent')
      expect(results).toHaveLength(0)
    })
  })

  describe('sortQuickReplies', () => {
    const replies = [
      { shortcut: 'charlie', usage_count: 5, created_at: new Date('2024-02-15') },
      { shortcut: 'alpha', usage_count: 10, created_at: new Date('2024-02-17') },
      { shortcut: 'bravo', usage_count: 3, created_at: new Date('2024-02-16') },
    ]

    it('should sort by usage count', () => {
      const sorted = sortQuickReplies(replies, 'usage')
      expect(sorted[0].shortcut).toBe('alpha')
      expect(sorted[1].shortcut).toBe('charlie')
      expect(sorted[2].shortcut).toBe('bravo')
    })

    it('should sort by recent date', () => {
      const sorted = sortQuickReplies(replies, 'recent')
      expect(sorted[0].shortcut).toBe('alpha')
      expect(sorted[1].shortcut).toBe('bravo')
      expect(sorted[2].shortcut).toBe('charlie')
    })

    it('should sort alphabetically', () => {
      const sorted = sortQuickReplies(replies, 'alphabetical')
      expect(sorted[0].shortcut).toBe('alpha')
      expect(sorted[1].shortcut).toBe('bravo')
      expect(sorted[2].shortcut).toBe('charlie')
    })

    it('should not mutate original array', () => {
      const original = [...replies]
      sortQuickReplies(replies, 'usage')
      expect(replies).toEqual(original)
    })
  })

  describe('incrementUsageCount', () => {
    it('should increment usage count by 1', () => {
      expect(incrementUsageCount(0)).toBe(1)
      expect(incrementUsageCount(5)).toBe(6)
      expect(incrementUsageCount(99)).toBe(100)
    })

    it('should handle large numbers', () => {
      expect(incrementUsageCount(999999)).toBe(1000000)
    })
  })

  describe('getPopularQuickReplies', () => {
    const replies = [
      { shortcut: 'a', usage_count: 10 },
      { shortcut: 'b', usage_count: 50 },
      { shortcut: 'c', usage_count: 5 },
      { shortcut: 'd', usage_count: 30 },
      { shortcut: 'e', usage_count: 20 },
      { shortcut: 'f', usage_count: 15 },
    ]

    it('should return top 5 by default', () => {
      const popular = getPopularQuickReplies(replies)
      expect(popular).toHaveLength(5)
      expect(popular[0].shortcut).toBe('b')
      expect(popular[1].shortcut).toBe('d')
    })

    it('should respect custom limit', () => {
      const popular = getPopularQuickReplies(replies, 3)
      expect(popular).toHaveLength(3)
      expect(popular[0].shortcut).toBe('b')
      expect(popular[1].shortcut).toBe('d')
      expect(popular[2].shortcut).toBe('e')
    })

    it('should handle limit larger than array', () => {
      const popular = getPopularQuickReplies(replies, 10)
      expect(popular).toHaveLength(6)
    })

    it('should handle empty array', () => {
      const popular = getPopularQuickReplies([])
      expect(popular).toHaveLength(0)
    })
  })
})
