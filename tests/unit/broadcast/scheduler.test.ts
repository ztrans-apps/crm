/**
 * Broadcast Scheduler - Unit Test
 * Tests scheduling logic and timezone conversion
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Timezone conversion functions
function convertWIBToUTC(wibDateString: string): Date {
  // Parse the date string as if it's in WIB timezone
  // WIB is UTC+7, so we need to subtract 7 hours to get UTC
  const date = new Date(wibDateString)
  
  // If the input doesn't have timezone info, treat it as WIB
  // Create a new date by subtracting 7 hours
  const utcTime = date.getTime() - (7 * 60 * 60 * 1000)
  return new Date(utcTime)
}

function convertUTCToWIB(utcDate: Date): Date {
  // WIB is UTC+7, so add 7 hours
  const wibTime = utcDate.getTime() + (7 * 60 * 60 * 1000)
  return new Date(wibTime)
}

function isScheduledTimeReached(scheduledUTC: Date, currentUTC: Date = new Date()): boolean {
  return currentUTC >= scheduledUTC
}

function getNextScheduledCampaigns(
  campaigns: Array<{ id: string; scheduled_at: Date; status: string }>,
  currentTime: Date = new Date()
): Array<{ id: string; scheduled_at: Date }> {
  return campaigns
    .filter(c => c.status === 'scheduled')
    .filter(c => isScheduledTimeReached(c.scheduled_at, currentTime))
    .map(c => ({ id: c.id, scheduled_at: c.scheduled_at }))
}

function calculateDelayUntilScheduled(scheduledUTC: Date, currentUTC: Date = new Date()): number {
  const delay = scheduledUTC.getTime() - currentUTC.getTime()
  return Math.max(0, delay)
}

function shouldTriggerScheduler(lastCheck: Date, interval: number = 60000): boolean {
  const now = new Date()
  const timeSinceLastCheck = now.getTime() - lastCheck.getTime()
  return timeSinceLastCheck >= interval
}

describe('Broadcast Scheduler', () => {
  describe('convertWIBToUTC', () => {
    it('should subtract 7 hours from WIB time', () => {
      // Test the conversion logic works
      const wibDate = '2024-02-17T17:00:00'
      const utcDate = convertWIBToUTC(wibDate)
      
      // Should be 7 hours earlier
      const original = new Date(wibDate)
      const diff = (original.getTime() - utcDate.getTime()) / (1000 * 60 * 60)
      expect(diff).toBe(7)
    })
  })

  describe('convertUTCToWIB', () => {
    it('should add 7 hours to UTC time', () => {
      // Test the conversion logic works
      const utcDate = new Date('2024-02-17T10:00:00Z')
      const wibDate = convertUTCToWIB(utcDate)
      
      // Should be 7 hours later
      const diff = (wibDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60)
      expect(diff).toBe(7)
    })
  })

  describe('isScheduledTimeReached', () => {
    it('should return true when scheduled time has passed', () => {
      const scheduled = new Date('2024-02-17T10:00:00Z')
      const current = new Date('2024-02-17T10:01:00Z')
      
      expect(isScheduledTimeReached(scheduled, current)).toBe(true)
    })

    it('should return true when scheduled time equals current time', () => {
      const scheduled = new Date('2024-02-17T10:00:00Z')
      const current = new Date('2024-02-17T10:00:00Z')
      
      expect(isScheduledTimeReached(scheduled, current)).toBe(true)
    })

    it('should return false when scheduled time is in future', () => {
      const scheduled = new Date('2024-02-17T10:00:00Z')
      const current = new Date('2024-02-17T09:59:00Z')
      
      expect(isScheduledTimeReached(scheduled, current)).toBe(false)
    })

    it('should use current time when not provided', () => {
      const pastDate = new Date('2020-01-01T00:00:00Z')
      expect(isScheduledTimeReached(pastDate)).toBe(true)
    })
  })

  describe('getNextScheduledCampaigns', () => {
    it('should return campaigns that are ready to send', () => {
      const campaigns = [
        { id: '1', scheduled_at: new Date('2024-02-17T09:00:00Z'), status: 'scheduled' },
        { id: '2', scheduled_at: new Date('2024-02-17T10:00:00Z'), status: 'scheduled' },
        { id: '3', scheduled_at: new Date('2024-02-17T11:00:00Z'), status: 'scheduled' },
      ]
      const currentTime = new Date('2024-02-17T10:30:00Z')
      
      const ready = getNextScheduledCampaigns(campaigns, currentTime)
      
      expect(ready).toHaveLength(2)
      expect(ready.map(c => c.id)).toEqual(['1', '2'])
    })

    it('should not return campaigns that are not scheduled status', () => {
      const campaigns = [
        { id: '1', scheduled_at: new Date('2024-02-17T09:00:00Z'), status: 'sending' },
        { id: '2', scheduled_at: new Date('2024-02-17T09:00:00Z'), status: 'completed' },
        { id: '3', scheduled_at: new Date('2024-02-17T09:00:00Z'), status: 'scheduled' },
      ]
      const currentTime = new Date('2024-02-17T10:00:00Z')
      
      const ready = getNextScheduledCampaigns(campaigns, currentTime)
      
      expect(ready).toHaveLength(1)
      expect(ready[0].id).toBe('3')
    })

    it('should return empty array when no campaigns are ready', () => {
      const campaigns = [
        { id: '1', scheduled_at: new Date('2024-02-17T11:00:00Z'), status: 'scheduled' },
        { id: '2', scheduled_at: new Date('2024-02-17T12:00:00Z'), status: 'scheduled' },
      ]
      const currentTime = new Date('2024-02-17T10:00:00Z')
      
      const ready = getNextScheduledCampaigns(campaigns, currentTime)
      
      expect(ready).toHaveLength(0)
    })

    it('should handle empty campaigns array', () => {
      const ready = getNextScheduledCampaigns([])
      expect(ready).toHaveLength(0)
    })
  })

  describe('calculateDelayUntilScheduled', () => {
    it('should calculate delay correctly', () => {
      const scheduled = new Date('2024-02-17T10:05:00Z')
      const current = new Date('2024-02-17T10:00:00Z')
      
      const delay = calculateDelayUntilScheduled(scheduled, current)
      
      expect(delay).toBe(5 * 60 * 1000) // 5 minutes in milliseconds
    })

    it('should return 0 for past scheduled time', () => {
      const scheduled = new Date('2024-02-17T09:00:00Z')
      const current = new Date('2024-02-17T10:00:00Z')
      
      const delay = calculateDelayUntilScheduled(scheduled, current)
      
      expect(delay).toBe(0)
    })

    it('should return 0 for current time', () => {
      const scheduled = new Date('2024-02-17T10:00:00Z')
      const current = new Date('2024-02-17T10:00:00Z')
      
      const delay = calculateDelayUntilScheduled(scheduled, current)
      
      expect(delay).toBe(0)
    })

    it('should calculate delay for hours', () => {
      const scheduled = new Date('2024-02-17T12:00:00Z')
      const current = new Date('2024-02-17T10:00:00Z')
      
      const delay = calculateDelayUntilScheduled(scheduled, current)
      
      expect(delay).toBe(2 * 60 * 60 * 1000) // 2 hours
    })
  })

  describe('shouldTriggerScheduler', () => {
    it('should return true when interval has passed', () => {
      const lastCheck = new Date('2024-02-17T10:00:00Z')
      const interval = 60000 // 1 minute
      
      // Mock current time to be 2 minutes later
      vi.setSystemTime(new Date('2024-02-17T10:02:00Z'))
      
      expect(shouldTriggerScheduler(lastCheck, interval)).toBe(true)
      
      vi.useRealTimers()
    })

    it('should return false when interval has not passed', () => {
      const lastCheck = new Date('2024-02-17T10:00:00Z')
      const interval = 60000 // 1 minute
      
      // Mock current time to be 30 seconds later
      vi.setSystemTime(new Date('2024-02-17T10:00:30Z'))
      
      expect(shouldTriggerScheduler(lastCheck, interval)).toBe(false)
      
      vi.useRealTimers()
    })

    it('should return true when exactly at interval', () => {
      const lastCheck = new Date('2024-02-17T10:00:00Z')
      const interval = 60000 // 1 minute
      
      // Mock current time to be exactly 1 minute later
      vi.setSystemTime(new Date('2024-02-17T10:01:00Z'))
      
      expect(shouldTriggerScheduler(lastCheck, interval)).toBe(true)
      
      vi.useRealTimers()
    })

    it('should use default interval of 60 seconds', () => {
      const lastCheck = new Date('2024-02-17T10:00:00Z')
      
      // Mock current time to be 2 minutes later
      vi.setSystemTime(new Date('2024-02-17T10:02:00Z'))
      
      expect(shouldTriggerScheduler(lastCheck)).toBe(true)
      
      vi.useRealTimers()
    })
  })
})
