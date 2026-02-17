/**
 * Broadcast Campaign Validator - Unit Test
 * Tests campaign validation logic
 */

import { describe, it, expect } from 'vitest'

// Campaign validation functions
function validateCampaignName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Campaign name is required' }
  }
  
  if (name.trim().length < 3) {
    return { valid: false, error: 'Campaign name must be at least 3 characters' }
  }
  
  if (name.length > 100) {
    return { valid: false, error: 'Campaign name must not exceed 100 characters' }
  }
  
  return { valid: true }
}

function validateScheduledTime(scheduledAt: string | null): { valid: boolean; error?: string } {
  if (!scheduledAt) {
    return { valid: true } // Scheduled time is optional
  }
  
  const scheduledDate = new Date(scheduledAt)
  
  if (isNaN(scheduledDate.getTime())) {
    return { valid: false, error: 'Invalid date format' }
  }
  
  const now = new Date()
  if (scheduledDate <= now) {
    return { valid: false, error: 'Scheduled time must be in the future' }
  }
  
  return { valid: true }
}

function validateCampaignStatus(status: string): { valid: boolean; error?: string } {
  const validStatuses = ['draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled']
  
  if (!validStatuses.includes(status.toLowerCase())) {
    return { valid: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }
  }
  
  return { valid: true }
}

function canTransitionStatus(from: string, to: string): boolean {
  const transitions: Record<string, string[]> = {
    draft: ['scheduled', 'sending', 'cancelled'],
    scheduled: ['sending', 'cancelled'],
    sending: ['completed', 'failed'],
    completed: [],
    failed: ['sending'], // Can retry
    cancelled: [],
  }
  
  return transitions[from]?.includes(to) || false
}

describe('Broadcast Campaign Validator', () => {
  describe('validateCampaignName', () => {
    it('should accept valid campaign names', () => {
      expect(validateCampaignName('Summer Sale 2024').valid).toBe(true)
      expect(validateCampaignName('New Product Launch').valid).toBe(true)
      expect(validateCampaignName('ABC').valid).toBe(true)
    })

    it('should reject empty or null names', () => {
      const result1 = validateCampaignName('')
      expect(result1.valid).toBe(false)
      expect(result1.error).toContain('required')

      const result2 = validateCampaignName(null as any)
      expect(result2.valid).toBe(false)
    })

    it('should reject names that are too short', () => {
      const result = validateCampaignName('AB')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('at least 3 characters')
    })

    it('should reject names that are too long', () => {
      const longName = 'A'.repeat(101)
      const result = validateCampaignName(longName)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not exceed 100 characters')
    })

    it('should trim whitespace when checking length', () => {
      const result = validateCampaignName('  AB  ')
      expect(result.valid).toBe(false)
    })
  })

  describe('validateScheduledTime', () => {
    it('should accept null (immediate send)', () => {
      expect(validateScheduledTime(null).valid).toBe(true)
    })

    it('should accept future dates', () => {
      const futureDate = new Date()
      futureDate.setHours(futureDate.getHours() + 1)
      expect(validateScheduledTime(futureDate.toISOString()).valid).toBe(true)
    })

    it('should reject past dates', () => {
      const pastDate = new Date()
      pastDate.setHours(pastDate.getHours() - 1)
      const result = validateScheduledTime(pastDate.toISOString())
      expect(result.valid).toBe(false)
      expect(result.error).toContain('must be in the future')
    })

    it('should reject invalid date formats', () => {
      const result = validateScheduledTime('invalid-date')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid date format')
    })

    it('should reject current time', () => {
      const now = new Date()
      const result = validateScheduledTime(now.toISOString())
      expect(result.valid).toBe(false)
    })
  })

  describe('validateCampaignStatus', () => {
    it('should accept valid statuses', () => {
      expect(validateCampaignStatus('draft').valid).toBe(true)
      expect(validateCampaignStatus('scheduled').valid).toBe(true)
      expect(validateCampaignStatus('sending').valid).toBe(true)
      expect(validateCampaignStatus('completed').valid).toBe(true)
      expect(validateCampaignStatus('failed').valid).toBe(true)
      expect(validateCampaignStatus('cancelled').valid).toBe(true)
    })

    it('should accept case-insensitive statuses', () => {
      expect(validateCampaignStatus('DRAFT').valid).toBe(true)
      expect(validateCampaignStatus('Sending').valid).toBe(true)
    })

    it('should reject invalid statuses', () => {
      const result = validateCampaignStatus('invalid')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid status')
    })
  })

  describe('canTransitionStatus', () => {
    it('should allow valid transitions from draft', () => {
      expect(canTransitionStatus('draft', 'scheduled')).toBe(true)
      expect(canTransitionStatus('draft', 'sending')).toBe(true)
      expect(canTransitionStatus('draft', 'cancelled')).toBe(true)
    })

    it('should allow valid transitions from scheduled', () => {
      expect(canTransitionStatus('scheduled', 'sending')).toBe(true)
      expect(canTransitionStatus('scheduled', 'cancelled')).toBe(true)
    })

    it('should allow valid transitions from sending', () => {
      expect(canTransitionStatus('sending', 'completed')).toBe(true)
      expect(canTransitionStatus('sending', 'failed')).toBe(true)
    })

    it('should allow retry from failed', () => {
      expect(canTransitionStatus('failed', 'sending')).toBe(true)
    })

    it('should not allow transitions from completed', () => {
      expect(canTransitionStatus('completed', 'sending')).toBe(false)
      expect(canTransitionStatus('completed', 'draft')).toBe(false)
    })

    it('should not allow transitions from cancelled', () => {
      expect(canTransitionStatus('cancelled', 'sending')).toBe(false)
      expect(canTransitionStatus('cancelled', 'scheduled')).toBe(false)
    })

    it('should not allow invalid transitions', () => {
      expect(canTransitionStatus('draft', 'completed')).toBe(false)
      expect(canTransitionStatus('scheduled', 'completed')).toBe(false)
      expect(canTransitionStatus('sending', 'draft')).toBe(false)
    })
  })
})
