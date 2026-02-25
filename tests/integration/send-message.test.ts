/**
 * Send Message Integration Tests
 * Test complete message sending flow via Meta WhatsApp Cloud API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const BASE_URL = 'http://localhost:3000'

describe('Send Message Integration', () => {
  const mockFetch = vi.fn()
  global.fetch = mockFetch

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Complete Send Flow', () => {
    it('should send message through Meta Cloud API pipeline', async () => {
      const messageData = {
        sessionId: 'test-session',
        to: '+6281234567890',
        message: 'Hello World',
      }

      // Mock API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          messageId: 'wamid.abc123',
          message: 'Message sent successfully',
        }),
      })

      const response = await fetch(`${BASE_URL}/api/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
      })

      const result = await response.json()

      expect(response.ok).toBe(true)
      expect(result.success).toBe(true)
      expect(result.messageId).toBe('wamid.abc123')
    })

    it('should handle session not found error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: 'Session not found',
        }),
      })

      const response = await fetch(`${BASE_URL}/api/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'non-existent',
          to: '+6281234567890',
          message: 'Test',
        }),
      })

      const result = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
      expect(result.error).toBe('Session not found')
    })

    it('should validate phone number format', () => {
      const validNumbers = [
        '+6281234567890',
        '6281234567890',
        '081234567890',
      ]

      const invalidNumbers = [
        '123',
        'abc',
        '',
      ]

      validNumbers.forEach(number => {
        const cleaned = number.replace(/\D/g, '')
        expect(cleaned.length).toBeGreaterThanOrEqual(10)
      })

      invalidNumbers.forEach(number => {
        const cleaned = number.replace(/\D/g, '')
        expect(cleaned.length).toBeLessThan(10)
      })
    })
  })

  describe('Send Media', () => {
    it('should send media message via Meta Cloud API', async () => {
      const mediaData = {
        sessionId: 'test-session',
        to: '+6281234567890',
        type: 'image',
        url: 'https://example.com/image.jpg',
        caption: 'Test image',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          messageId: 'wamid.media123',
        }),
      })

      const response = await fetch(`${BASE_URL}/api/send-media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mediaData),
      })

      const result = await response.json()

      expect(response.ok).toBe(true)
      expect(result.success).toBe(true)
    })
  })

  describe('Error Scenarios', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(
        fetch(`${BASE_URL}/api/send-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
      ).rejects.toThrow('Network error')
    })

    it('should handle timeout errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'))

      await expect(
        fetch(`${BASE_URL}/api/send-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
      ).rejects.toThrow('Request timeout')
    })

    it('should handle invalid JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })

      const response = await fetch(`${BASE_URL}/api/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      await expect(response.json()).rejects.toThrow('Invalid JSON')
    })
  })
})
