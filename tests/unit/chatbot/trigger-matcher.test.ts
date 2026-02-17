/**
 * Chatbot Trigger Matcher - Unit Test
 * Tests chatbot trigger matching logic
 */

import { describe, it, expect } from 'vitest'

// Trigger matching functions
function matchKeywordTrigger(message: string, keywords: string[]): boolean {
  const lowerMessage = message.toLowerCase().trim()
  
  return keywords.some(keyword => {
    const lowerKeyword = keyword.toLowerCase().trim()
    return lowerMessage.includes(lowerKeyword)
  })
}

function matchExactKeyword(message: string, keywords: string[]): boolean {
  const lowerMessage = message.toLowerCase().trim()
  
  return keywords.some(keyword => {
    const lowerKeyword = keyword.toLowerCase().trim()
    return lowerMessage === lowerKeyword
  })
}

function isGreetingMessage(message: string): boolean {
  const greetings = [
    'hi', 'hello', 'halo', 'hai', 'hey',
    'good morning', 'good afternoon', 'good evening',
    'selamat pagi', 'selamat siang', 'selamat sore', 'selamat malam',
    'pagi', 'siang', 'sore', 'malam',
  ]
  
  const lowerMessage = message.toLowerCase().trim()
  
  return greetings.some(greeting => {
    // Match exact greeting or greeting at start followed by space or punctuation
    return lowerMessage === greeting || 
           lowerMessage.startsWith(greeting + ' ') ||
           lowerMessage.startsWith(greeting + ',')
  })
}

function shouldTriggerAlways(): boolean {
  return true
}

function isWithinSchedule(
  currentTime: Date,
  schedule: { start: string; end: string; days: number[] }
): boolean {
  const currentDay = currentTime.getDay() // 0 = Sunday, 6 = Saturday
  const currentHour = currentTime.getHours()
  const currentMinute = currentTime.getMinutes()
  
  // Check if current day is in schedule
  if (!schedule.days.includes(currentDay)) {
    return false
  }
  
  // Parse start and end times (format: "HH:MM")
  const [startHour, startMinute] = schedule.start.split(':').map(Number)
  const [endHour, endMinute] = schedule.end.split(':').map(Number)
  
  const currentMinutes = currentHour * 60 + currentMinute
  const startMinutes = startHour * 60 + startMinute
  const endMinutes = endHour * 60 + endMinute
  
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes
}

function matchIntentTrigger(message: string, intents: string[]): { matched: boolean; intent?: string } {
  const lowerMessage = message.toLowerCase().trim()
  
  // Simple intent matching based on keywords
  const intentKeywords: Record<string, string[]> = {
    'order_status': ['status pesanan', 'cek pesanan', 'order status', 'track order', 'lacak pesanan'],
    'product_info': ['info produk', 'product info', 'harga', 'price', 'spesifikasi', 'spec'],
    'complaint': ['komplain', 'complaint', 'masalah', 'problem', 'rusak', 'broken'],
    'payment': ['pembayaran', 'payment', 'bayar', 'pay', 'transfer'],
    'shipping': ['pengiriman', 'shipping', 'kirim', 'deliver', 'ongkir'],
  }
  
  for (const intent of intents) {
    const keywords = intentKeywords[intent] || []
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      return { matched: true, intent }
    }
  }
  
  return { matched: false }
}

function prioritizeTriggers(triggers: Array<{ type: string; priority: number }>): Array<{ type: string; priority: number }> {
  return triggers.sort((a, b) => b.priority - a.priority)
}

describe('Chatbot Trigger Matcher', () => {
  describe('matchKeywordTrigger', () => {
    it('should match when message contains keyword', () => {
      expect(matchKeywordTrigger('I want to buy a product', ['buy', 'purchase'])).toBe(true)
      expect(matchKeywordTrigger('How much does it cost?', ['cost', 'price'])).toBe(true)
    })

    it('should be case-insensitive', () => {
      expect(matchKeywordTrigger('HELLO WORLD', ['hello'])).toBe(true)
      expect(matchKeywordTrigger('hello world', ['HELLO'])).toBe(true)
    })

    it('should match partial words', () => {
      expect(matchKeywordTrigger('I am buying something', ['buy'])).toBe(true)
    })

    it('should not match when keyword is not present', () => {
      expect(matchKeywordTrigger('Hello there', ['goodbye'])).toBe(false)
    })

    it('should match any keyword in array', () => {
      expect(matchKeywordTrigger('I need help', ['help', 'support', 'assist'])).toBe(true)
      expect(matchKeywordTrigger('Can you assist me?', ['help', 'support', 'assist'])).toBe(true)
    })

    it('should handle empty keywords array', () => {
      expect(matchKeywordTrigger('Hello', [])).toBe(false)
    })

    it('should trim whitespace', () => {
      expect(matchKeywordTrigger('  hello  ', ['hello'])).toBe(true)
    })
  })

  describe('matchExactKeyword', () => {
    it('should match exact keyword only', () => {
      expect(matchExactKeyword('hello', ['hello'])).toBe(true)
      expect(matchExactKeyword('hello world', ['hello'])).toBe(false)
    })

    it('should be case-insensitive', () => {
      expect(matchExactKeyword('HELLO', ['hello'])).toBe(true)
      expect(matchExactKeyword('hello', ['HELLO'])).toBe(true)
    })

    it('should trim whitespace', () => {
      expect(matchExactKeyword('  hello  ', ['hello'])).toBe(true)
    })

    it('should not match partial matches', () => {
      expect(matchExactKeyword('hello there', ['hello'])).toBe(false)
      expect(matchExactKeyword('say hello', ['hello'])).toBe(false)
    })

    it('should match any exact keyword in array', () => {
      expect(matchExactKeyword('hi', ['hi', 'hello', 'hey'])).toBe(true)
      expect(matchExactKeyword('hello', ['hi', 'hello', 'hey'])).toBe(true)
    })
  })

  describe('isGreetingMessage', () => {
    it('should match English greetings', () => {
      expect(isGreetingMessage('hi')).toBe(true)
      expect(isGreetingMessage('hello')).toBe(true)
      expect(isGreetingMessage('hey')).toBe(true)
      expect(isGreetingMessage('good morning')).toBe(true)
    })

    it('should match Indonesian greetings', () => {
      expect(isGreetingMessage('halo')).toBe(true)
      expect(isGreetingMessage('hai')).toBe(true)
      expect(isGreetingMessage('selamat pagi')).toBe(true)
      expect(isGreetingMessage('selamat siang')).toBe(true)
    })

    it('should match greetings with additional text', () => {
      expect(isGreetingMessage('hello there')).toBe(true)
      expect(isGreetingMessage('hi, how are you?')).toBe(true)
      expect(isGreetingMessage('good morning everyone')).toBe(true)
    })

    it('should be case-insensitive', () => {
      expect(isGreetingMessage('HELLO')).toBe(true)
      expect(isGreetingMessage('Hi')).toBe(true)
    })

    it('should not match non-greetings', () => {
      expect(isGreetingMessage('I need help')).toBe(false)
      expect(isGreetingMessage('What is the price?')).toBe(false)
    })

    it('should not match greeting in middle of sentence', () => {
      expect(isGreetingMessage('I want to say hello')).toBe(false)
    })
  })

  describe('shouldTriggerAlways', () => {
    it('should always return true', () => {
      expect(shouldTriggerAlways()).toBe(true)
      expect(shouldTriggerAlways()).toBe(true)
      expect(shouldTriggerAlways()).toBe(true)
    })
  })

  describe('isWithinSchedule', () => {
    it('should return true when within schedule', () => {
      // Monday 10:00
      const time = new Date('2024-02-19T10:00:00')
      const schedule = {
        start: '09:00',
        end: '17:00',
        days: [1, 2, 3, 4, 5], // Monday to Friday
      }
      
      expect(isWithinSchedule(time, schedule)).toBe(true)
    })

    it('should return false when outside time range', () => {
      // Monday 18:00 (after 17:00)
      const time = new Date('2024-02-19T18:00:00')
      const schedule = {
        start: '09:00',
        end: '17:00',
        days: [1, 2, 3, 4, 5],
      }
      
      expect(isWithinSchedule(time, schedule)).toBe(false)
    })

    it('should return false when not in scheduled days', () => {
      // Sunday 10:00
      const time = new Date('2024-02-18T10:00:00')
      const schedule = {
        start: '09:00',
        end: '17:00',
        days: [1, 2, 3, 4, 5], // Monday to Friday only
      }
      
      expect(isWithinSchedule(time, schedule)).toBe(false)
    })

    it('should handle edge cases at start time', () => {
      // Monday 09:00 (exactly at start)
      const time = new Date('2024-02-19T09:00:00')
      const schedule = {
        start: '09:00',
        end: '17:00',
        days: [1, 2, 3, 4, 5],
      }
      
      expect(isWithinSchedule(time, schedule)).toBe(true)
    })

    it('should handle edge cases at end time', () => {
      // Monday 17:00 (exactly at end)
      const time = new Date('2024-02-19T17:00:00')
      const schedule = {
        start: '09:00',
        end: '17:00',
        days: [1, 2, 3, 4, 5],
      }
      
      expect(isWithinSchedule(time, schedule)).toBe(true)
    })

    it('should handle 24/7 schedule', () => {
      const time = new Date('2024-02-18T03:00:00') // Sunday 3 AM
      const schedule = {
        start: '00:00',
        end: '23:59',
        days: [0, 1, 2, 3, 4, 5, 6], // All days
      }
      
      expect(isWithinSchedule(time, schedule)).toBe(true)
    })
  })

  describe('matchIntentTrigger', () => {
    it('should match order status intent', () => {
      const result = matchIntentTrigger('Cek status pesanan saya', ['order_status'])
      expect(result.matched).toBe(true)
      expect(result.intent).toBe('order_status')
    })

    it('should match product info intent', () => {
      const result = matchIntentTrigger('Berapa harga produk ini?', ['product_info'])
      expect(result.matched).toBe(true)
      expect(result.intent).toBe('product_info')
    })

    it('should match complaint intent', () => {
      const result = matchIntentTrigger('Saya mau komplain', ['complaint'])
      expect(result.matched).toBe(true)
      expect(result.intent).toBe('complaint')
    })

    it('should not match when intent not in list', () => {
      const result = matchIntentTrigger('Cek status pesanan', ['product_info', 'payment'])
      expect(result.matched).toBe(false)
      expect(result.intent).toBeUndefined()
    })

    it('should match first matching intent', () => {
      const result = matchIntentTrigger('Info harga produk', ['order_status', 'product_info'])
      expect(result.matched).toBe(true)
      expect(result.intent).toBe('product_info')
    })

    it('should be case-insensitive', () => {
      const result = matchIntentTrigger('CEK STATUS PESANAN', ['order_status'])
      expect(result.matched).toBe(true)
    })
  })

  describe('prioritizeTriggers', () => {
    it('should sort triggers by priority descending', () => {
      const triggers = [
        { type: 'keyword', priority: 1 },
        { type: 'intent', priority: 3 },
        { type: 'greeting', priority: 2 },
      ]
      
      const sorted = prioritizeTriggers(triggers)
      
      expect(sorted[0].type).toBe('intent')
      expect(sorted[1].type).toBe('greeting')
      expect(sorted[2].type).toBe('keyword')
    })

    it('should handle same priorities', () => {
      const triggers = [
        { type: 'a', priority: 2 },
        { type: 'b', priority: 2 },
        { type: 'c', priority: 2 },
      ]
      
      const sorted = prioritizeTriggers(triggers)
      
      expect(sorted).toHaveLength(3)
      sorted.forEach(t => expect(t.priority).toBe(2))
    })

    it('should handle empty array', () => {
      const sorted = prioritizeTriggers([])
      expect(sorted).toHaveLength(0)
    })

    it('should handle single trigger', () => {
      const triggers = [{ type: 'keyword', priority: 1 }]
      const sorted = prioritizeTriggers(triggers)
      
      expect(sorted).toHaveLength(1)
      expect(sorted[0].type).toBe('keyword')
    })
  })
})
