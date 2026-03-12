/**
 * Tests for RealtimeManager
 * 
 * Verifies:
 * - Subscription lifecycle management
 * - Connection failure handling
 * - Automatic reconnection with exponential backoff
 * - Proper cleanup
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RealtimeManager } from '@/lib/realtime/realtime-manager'

// Mock Supabase client
const createMockSupabaseClient = () => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn((callback) => {
      // Simulate successful subscription
      setTimeout(() => callback('SUBSCRIBED'), 0)
      return mockChannel
    }),
    unsubscribe: vi.fn(),
  }

  return {
    channel: vi.fn(() => mockChannel),
    _mockChannel: mockChannel,
  }
}

describe('RealtimeManager', () => {
  let manager: RealtimeManager
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    manager = new RealtimeManager(mockSupabase as any)
  })

  afterEach(() => {
    manager.unsubscribeAll()
    vi.clearAllTimers()
  })

  describe('subscribe', () => {
    it('should create a channel and subscribe', () => {
      const onData = vi.fn()
      
      manager.subscribe({
        channel: 'test-channel',
        table: 'messages',
        event: 'INSERT',
        onData,
      })

      expect(mockSupabase.channel).toHaveBeenCalledWith('test-channel')
      expect(mockSupabase._mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        }),
        expect.any(Function)
      )
      expect(mockSupabase._mockChannel.subscribe).toHaveBeenCalled()
    })

    it('should apply filter when provided', () => {
      const onData = vi.fn()
      
      manager.subscribe({
        channel: 'test-channel',
        table: 'messages',
        filter: 'conversation_id=eq.123',
        onData,
      })

      expect(mockSupabase._mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          filter: 'conversation_id=eq.123',
        }),
        expect.any(Function)
      )
    })

    it('should call onData when data is received', async () => {
      const onData = vi.fn()
      let dataCallback: any

      mockSupabase._mockChannel.on.mockImplementation((event, config, callback) => {
        if (event === 'postgres_changes') {
          dataCallback = callback
        }
        return mockSupabase._mockChannel
      })

      manager.subscribe({
        channel: 'test-channel',
        table: 'messages',
        onData,
      })

      // Simulate data received
      const payload = { new: { id: '1', content: 'test' } }
      dataCallback(payload)

      expect(onData).toHaveBeenCalledWith(payload)
    })

    it('should return unsubscribe function', () => {
      const unsubscribe = manager.subscribe({
        channel: 'test-channel',
        table: 'messages',
        onData: vi.fn(),
      })

      expect(typeof unsubscribe).toBe('function')
      
      unsubscribe()
      
      expect(mockSupabase._mockChannel.unsubscribe).toHaveBeenCalled()
    })
  })

  describe('connection status', () => {
    it('should track connection status', async () => {
      manager.subscribe({
        channel: 'test-channel',
        table: 'messages',
        onData: vi.fn(),
      })

      // Wait for subscription callback
      await new Promise(resolve => setTimeout(resolve, 10))

      const status = manager.getConnectionStatus('test-channel')
      expect(status).toBeDefined()
      expect(status?.isConnected).toBe(true)
      expect(status?.reconnectAttempts).toBe(0)
    })

    it('should update status on channel error', async () => {
      mockSupabase._mockChannel.subscribe.mockImplementation((callback) => {
        setTimeout(() => callback('CHANNEL_ERROR', { message: 'Test error' }), 0)
        return mockSupabase._mockChannel
      })

      const onError = vi.fn()
      
      manager.subscribe({
        channel: 'test-channel',
        table: 'messages',
        onData: vi.fn(),
        onError,
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      const status = manager.getConnectionStatus('test-channel')
      expect(status?.isConnected).toBe(false)
      expect(status?.lastError).toBeDefined()
      expect(onError).toHaveBeenCalled()
    })

    it('should check if channel is connected', async () => {
      manager.subscribe({
        channel: 'test-channel',
        table: 'messages',
        onData: vi.fn(),
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      expect(manager.isConnected('test-channel')).toBe(true)
      expect(manager.isConnected('non-existent')).toBe(false)
    })
  })

  describe('reconnection', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should attempt reconnection on channel error', async () => {
      let subscribeCount = 0
      mockSupabase._mockChannel.subscribe.mockImplementation((callback) => {
        subscribeCount++
        if (subscribeCount === 1) {
          // First attempt fails
          setTimeout(() => callback('CHANNEL_ERROR', { message: 'Test error' }), 0)
        } else {
          // Second attempt succeeds
          setTimeout(() => callback('SUBSCRIBED'), 0)
        }
        return mockSupabase._mockChannel
      })

      const onReconnect = vi.fn()
      
      manager.subscribe({
        channel: 'test-channel',
        table: 'messages',
        onData: vi.fn(),
        onReconnect,
      })

      // Wait for initial subscription
      await vi.runAllTimersAsync()

      // Should have attempted reconnection
      expect(subscribeCount).toBeGreaterThan(1)
    })

    it('should use exponential backoff for reconnection', async () => {
      let subscribeCount = 0
      let reconnectAttempts = 0
      const maxAttempts = 3
      
      mockSupabase._mockChannel.subscribe.mockImplementation((callback) => {
        subscribeCount++
        reconnectAttempts++
        
        // Fail only for the first few attempts, then stop
        if (reconnectAttempts <= maxAttempts) {
          setTimeout(() => callback('CHANNEL_ERROR', { message: 'Test error' }), 0)
        }
        return mockSupabase._mockChannel
      })

      manager.subscribe({
        channel: 'test-channel',
        table: 'messages',
        onData: vi.fn(),
      })

      // Initial subscription
      await vi.advanceTimersByTimeAsync(100)
      const initialCount = subscribeCount

      // First reconnect (1s delay)
      await vi.advanceTimersByTimeAsync(1100)
      expect(subscribeCount).toBeGreaterThanOrEqual(initialCount + 1)

      // Second reconnect (2s delay)
      await vi.advanceTimersByTimeAsync(2100)
      expect(subscribeCount).toBeGreaterThanOrEqual(initialCount + 2)

      // Cleanup
      manager.unsubscribe('test-channel')
    })

    it('should stop reconnecting after max attempts', async () => {
      let subscribeCount = 0
      mockSupabase._mockChannel.subscribe.mockImplementation((callback) => {
        subscribeCount++
        setTimeout(() => callback('CHANNEL_ERROR', { message: 'Test error' }), 0)
        return mockSupabase._mockChannel
      })

      manager.subscribe({
        channel: 'test-channel',
        table: 'messages',
        onData: vi.fn(),
      })

      // Run through reconnection attempts with controlled timing
      // Initial + 5 reconnects = 6 total attempts
      await vi.advanceTimersByTimeAsync(100) // Initial
      await vi.advanceTimersByTimeAsync(1100) // 1st reconnect (1s)
      await vi.advanceTimersByTimeAsync(2100) // 2nd reconnect (2s)
      await vi.advanceTimersByTimeAsync(4100) // 3rd reconnect (4s)
      await vi.advanceTimersByTimeAsync(8100) // 4th reconnect (8s)
      await vi.advanceTimersByTimeAsync(16100) // 5th reconnect (16s)
      await vi.advanceTimersByTimeAsync(32100) // Should not trigger more

      // Should stop at max attempts (5 reconnects + 1 initial = 6 total)
      expect(subscribeCount).toBeLessThanOrEqual(6)
      
      // Cleanup
      manager.unsubscribe('test-channel')
    })
  })

  describe('unsubscribe', () => {
    it('should unsubscribe from channel', () => {
      manager.subscribe({
        channel: 'test-channel',
        table: 'messages',
        onData: vi.fn(),
      })

      manager.unsubscribe('test-channel')

      expect(mockSupabase._mockChannel.unsubscribe).toHaveBeenCalled()
      expect(manager.getConnectionStatus('test-channel')).toBeUndefined()
    })

    it('should clear reconnect timer on unsubscribe', async () => {
      vi.useFakeTimers()
      let subscribeCount = 0

      mockSupabase._mockChannel.subscribe.mockImplementation((callback) => {
        subscribeCount++
        setTimeout(() => callback('CHANNEL_ERROR', { message: 'Test error' }), 0)
        return mockSupabase._mockChannel
      })

      manager.subscribe({
        channel: 'test-channel',
        table: 'messages',
        onData: vi.fn(),
      })

      await vi.advanceTimersByTimeAsync(100)
      const countBeforeUnsubscribe = subscribeCount

      // Unsubscribe before reconnect timer fires
      manager.unsubscribe('test-channel')

      // Advance timers - should not trigger reconnection
      await vi.advanceTimersByTimeAsync(5000)
      
      // Subscribe count should not increase after unsubscribe
      expect(subscribeCount).toBe(countBeforeUnsubscribe)

    })
  })

  describe('unsubscribeAll', () => {
    it('should unsubscribe from all channels', () => {
      manager.subscribe({
        channel: 'channel-1',
        table: 'messages',
        onData: vi.fn(),
      })

      manager.subscribe({
        channel: 'channel-2',
        table: 'conversations',
        onData: vi.fn(),
      })

      expect(manager.getActiveChannels()).toHaveLength(2)

      manager.unsubscribeAll()

      expect(manager.getActiveChannels()).toHaveLength(0)
      expect(mockSupabase._mockChannel.unsubscribe).toHaveBeenCalledTimes(2)
    })
  })

  describe('getActiveChannels', () => {
    it('should return list of active channels', () => {
      manager.subscribe({
        channel: 'channel-1',
        table: 'messages',
        onData: vi.fn(),
      })

      manager.subscribe({
        channel: 'channel-2',
        table: 'conversations',
        onData: vi.fn(),
      })

      const channels = manager.getActiveChannels()
      expect(channels).toContain('channel-1')
      expect(channels).toContain('channel-2')
      expect(channels).toHaveLength(2)
    })
  })

  describe('error handling', () => {
    it('should handle errors in onData callback', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const onData = vi.fn(() => {
        throw new Error('Test error')
      })
      const onError = vi.fn()

      let dataCallback: any
      mockSupabase._mockChannel.on.mockImplementation((event, config, callback) => {
        if (event === 'postgres_changes') {
          dataCallback = callback
        }
        return mockSupabase._mockChannel
      })

      manager.subscribe({
        channel: 'test-channel',
        table: 'messages',
        onData,
        onError,
      })

      // Simulate data received
      dataCallback({ new: { id: '1' } })

      expect(consoleError).toHaveBeenCalled()
      expect(onError).toHaveBeenCalledWith(expect.any(Error))

      consoleError.mockRestore()
    })
  })
})
