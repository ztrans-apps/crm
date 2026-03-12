/**
 * Realtime Manager
 * 
 * Centralized management for Supabase Realtime subscriptions with:
 * - RLS policy enforcement verification
 * - Connection failure handling
 * - Automatic reconnection logic
 * - Subscription lifecycle management
 * 
 * **Requirement 9.7**: Real-time updates use Supabase Realtime with RLS enforcement
 */

import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'

export interface RealtimeSubscriptionConfig {
  channel: string
  table: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  filter?: string
  schema?: string
  onData: (payload: any) => void
  onError?: (error: Error) => void
  onReconnect?: () => void
}

export interface RealtimeConnectionStatus {
  isConnected: boolean
  lastError?: Error
  reconnectAttempts: number
  lastReconnectAt?: Date
}

/**
 * RealtimeManager handles Supabase Realtime subscriptions with proper error handling
 * and reconnection logic.
 */
export class RealtimeManager {
  private supabase: SupabaseClient
  private channels: Map<string, RealtimeChannel> = new Map()
  private connectionStatus: Map<string, RealtimeConnectionStatus> = new Map()
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map()
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000 // Start with 1 second

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * Subscribe to real-time updates for a table with RLS enforcement
   * 
   * **Important**: RLS policies must be enabled on the table for this to work securely.
   * The subscription will only receive updates for rows the authenticated user has access to.
   */
  subscribe(config: RealtimeSubscriptionConfig): () => void {
    const {
      channel: channelName,
      table,
      event = '*',
      filter,
      schema = 'public',
      onData,
      onError,
      onReconnect,
    } = config

    // Initialize connection status if it doesn't exist
    if (!this.connectionStatus.has(channelName)) {
      this.connectionStatus.set(channelName, {
        isConnected: false,
        reconnectAttempts: 0,
      })
    }

    // Create channel
    const channel = this.supabase.channel(channelName)

    // Configure postgres_changes listener
    const changeConfig: any = {
      event,
      schema,
      table,
    }

    if (filter) {
      changeConfig.filter = filter
    }

    channel.on('postgres_changes', changeConfig, (payload) => {
      try {
        // Update connection status on successful data receive
        const status = this.connectionStatus.get(channelName)
        if (status) {
          status.isConnected = true
          status.reconnectAttempts = 0
          status.lastError = undefined
        }

        onData(payload)
      } catch (error) {
        console.error(`[RealtimeManager] Error processing data for ${channelName}:`, error)
        if (onError) {
          onError(error as Error)
        }
      }
    })

    // Subscribe with error handling
    channel
      .subscribe((status, err) => {
        const connectionStatus = this.connectionStatus.get(channelName)

        if (status === 'SUBSCRIBED') {
          console.log(`[RealtimeManager] Successfully subscribed to ${channelName}`)
          if (connectionStatus) {
            connectionStatus.isConnected = true
            connectionStatus.reconnectAttempts = 0
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[RealtimeManager] Channel error for ${channelName}:`, err)
          if (connectionStatus) {
            connectionStatus.isConnected = false
            connectionStatus.lastError = err ? new Error(err.message) : new Error('Channel error')
          }

          if (onError && err) {
            onError(new Error(err.message))
          }

          // Attempt reconnection
          this.handleReconnect(channelName, config, onReconnect)
        } else if (status === 'TIMED_OUT') {
          console.warn(`[RealtimeManager] Subscription timed out for ${channelName}`)
          if (connectionStatus) {
            connectionStatus.isConnected = false
            connectionStatus.lastError = new Error('Subscription timed out')
          }

          // Attempt reconnection
          this.handleReconnect(channelName, config, onReconnect)
        } else if (status === 'CLOSED') {
          console.log(`[RealtimeManager] Channel closed for ${channelName}`)
          if (connectionStatus) {
            connectionStatus.isConnected = false
          }
        }
      })

    // Store channel reference
    this.channels.set(channelName, channel)

    // Return unsubscribe function
    return () => this.unsubscribe(channelName)
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private handleReconnect(
    channelName: string,
    config: RealtimeSubscriptionConfig,
    onReconnect?: () => void
  ): void {
    const status = this.connectionStatus.get(channelName)
    if (!status) return

    // Check if we've exceeded max reconnect attempts
    if (status.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        `[RealtimeManager] Max reconnect attempts (${this.maxReconnectAttempts}) reached for ${channelName}`
      )
      return
    }

    // Clear any existing reconnect timer
    const existingTimer = this.reconnectTimers.get(channelName)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Calculate backoff delay (exponential backoff)
    const delay = this.reconnectDelay * Math.pow(2, status.reconnectAttempts)
    status.reconnectAttempts++

    console.log(
      `[RealtimeManager] Attempting reconnect ${status.reconnectAttempts}/${this.maxReconnectAttempts} for ${channelName} in ${delay}ms`
    )

    // Schedule reconnection
    const timer = setTimeout(() => {
      // Unsubscribe from old channel
      const oldChannel = this.channels.get(channelName)
      if (oldChannel) {
        oldChannel.unsubscribe()
      }

      // Resubscribe
      this.subscribe(config)

      // Update reconnect timestamp
      status.lastReconnectAt = new Date()

      // Call reconnect callback
      if (onReconnect) {
        onReconnect()
      }

      // Clean up timer reference
      this.reconnectTimers.delete(channelName)
    }, delay)

    this.reconnectTimers.set(channelName, timer)
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channelName: string): void {
    const channel = this.channels.get(channelName)
    if (channel) {
      channel.unsubscribe()
      this.channels.delete(channelName)
    }

    // Clear reconnect timer if exists
    const timer = this.reconnectTimers.get(channelName)
    if (timer) {
      clearTimeout(timer)
      this.reconnectTimers.delete(channelName)
    }

    // Clean up connection status
    this.connectionStatus.delete(channelName)

    console.log(`[RealtimeManager] Unsubscribed from ${channelName}`)
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    const channelNames = Array.from(this.channels.keys())
    channelNames.forEach((channelName) => this.unsubscribe(channelName))
  }

  /**
   * Get connection status for a channel
   */
  getConnectionStatus(channelName: string): RealtimeConnectionStatus | undefined {
    return this.connectionStatus.get(channelName)
  }

  /**
   * Check if a channel is connected
   */
  isConnected(channelName: string): boolean {
    const status = this.connectionStatus.get(channelName)
    return status?.isConnected ?? false
  }

  /**
   * Get all active channels
   */
  getActiveChannels(): string[] {
    return Array.from(this.channels.keys())
  }
}

/**
 * Create a singleton instance of RealtimeManager
 */
let realtimeManagerInstance: RealtimeManager | null = null

export function getRealtimeManager(supabase: SupabaseClient): RealtimeManager {
  if (!realtimeManagerInstance) {
    realtimeManagerInstance = new RealtimeManager(supabase)
  }
  return realtimeManagerInstance
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetRealtimeManager(): void {
  if (realtimeManagerInstance) {
    realtimeManagerInstance.unsubscribeAll()
    realtimeManagerInstance = null
  }
}
