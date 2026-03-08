/**
 * useRealtimeSubscription Hook
 * 
 * React hook for managing Supabase Realtime subscriptions with:
 * - Automatic cleanup on unmount
 * - Connection status tracking
 * - Error handling
 * - Reconnection support
 * 
 * **Requirement 9.7**: Real-time updates use Supabase Realtime with RLS enforcement
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  getRealtimeManager,
  RealtimeSubscriptionConfig,
  RealtimeConnectionStatus,
} from './realtime-manager'

export interface UseRealtimeSubscriptionOptions
  extends Omit<RealtimeSubscriptionConfig, 'onData'> {
  enabled?: boolean
  supabase: SupabaseClient
  onData: (payload: any) => void
  onError?: (error: Error) => void
  onReconnect?: () => void
}

export interface UseRealtimeSubscriptionReturn {
  isConnected: boolean
  error?: Error
  reconnectAttempts: number
  lastReconnectAt?: Date
  unsubscribe: () => void
}

/**
 * Hook for subscribing to Supabase Realtime updates with automatic cleanup
 * 
 * @example
 * ```tsx
 * const { isConnected, error } = useRealtimeSubscription({
 *   supabase,
 *   channel: 'messages-123',
 *   table: 'messages',
 *   event: 'INSERT',
 *   filter: 'conversation_id=eq.123',
 *   onData: (payload) => {
 *     console.log('New message:', payload.new)
 *   },
 *   onError: (error) => {
 *     console.error('Subscription error:', error)
 *   }
 * })
 * ```
 */
export function useRealtimeSubscription(
  options: UseRealtimeSubscriptionOptions
): UseRealtimeSubscriptionReturn {
  const {
    enabled = true,
    supabase,
    channel,
    table,
    event,
    filter,
    schema,
    onData,
    onError,
    onReconnect,
  } = options

  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>({
    isConnected: false,
    reconnectAttempts: 0,
  })

  const unsubscribeRef = useRef<(() => void) | null>(null)
  const managerRef = useRef<ReturnType<typeof getRealtimeManager> | null>(null)

  // Stable callback refs
  const onDataRef = useRef(onData)
  const onErrorRef = useRef(onError)
  const onReconnectRef = useRef(onReconnect)

  useEffect(() => {
    onDataRef.current = onData
    onErrorRef.current = onError
    onReconnectRef.current = onReconnect
  }, [onData, onError, onReconnect])

  // Manual unsubscribe function
  const unsubscribe = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      // Clean up if disabled
      unsubscribe()
      return
    }

    // Get or create manager instance
    if (!managerRef.current) {
      managerRef.current = getRealtimeManager(supabase)
    }

    const manager = managerRef.current

    // Subscribe
    const unsubscribeFn = manager.subscribe({
      channel,
      table,
      event,
      filter,
      schema,
      onData: (payload) => onDataRef.current(payload),
      onError: (error) => {
        setConnectionStatus((prev) => ({
          ...prev,
          isConnected: false,
          lastError: error,
        }))
        if (onErrorRef.current) {
          onErrorRef.current(error)
        }
      },
      onReconnect: () => {
        if (onReconnectRef.current) {
          onReconnectRef.current()
        }
      },
    })

    unsubscribeRef.current = unsubscribeFn

    // Poll connection status
    const statusInterval = setInterval(() => {
      const status = manager.getConnectionStatus(channel)
      if (status) {
        setConnectionStatus(status)
      }
    }, 1000)

    // Cleanup on unmount or when dependencies change
    return () => {
      clearInterval(statusInterval)
      unsubscribeFn()
    }
  }, [enabled, supabase, channel, table, event, filter, schema, unsubscribe])

  return {
    isConnected: connectionStatus.isConnected,
    error: connectionStatus.lastError,
    reconnectAttempts: connectionStatus.reconnectAttempts,
    lastReconnectAt: connectionStatus.lastReconnectAt,
    unsubscribe,
  }
}
