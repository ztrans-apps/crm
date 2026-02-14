/**
 * Delivery Status Service
 * Enhanced message delivery tracking and analytics
 */

import { createClient } from '@/lib/supabase/server'
import { webhookRouter } from './webhook-router.service'

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface DeliveryUpdate {
  messageId: string
  status: MessageStatus
  timestamp: string
  error?: string
}

class DeliveryStatusService {
  /**
   * Update message status
   */
  async updateStatus(
    messageId: string,
    status: MessageStatus,
    error?: string
  ): Promise<void> {
    try {
      const supabase = await createClient()

      // Get message details
      const { data: message, error: fetchError } = await supabase
        .from('messages')
        .select('id, tenant_id, conversation_id, conversations(whatsapp_session_id)')
        .eq('id', messageId)
        .single()

      if (fetchError || !message) {
        console.error('[DeliveryStatus] Message not found:', messageId)
        return
      }

      // Update status
      const { error: updateError } = await supabase
        .from('messages')
        .update({
          status,
          ...(error && { metadata: { error } }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', messageId)

      if (updateError) throw updateError

      console.log(`[DeliveryStatus] Updated message ${messageId} to ${status}`)

      // Emit webhook event
      const eventType = `message.${status}`
      await webhookRouter.routeEvent({
        type: eventType,
        tenantId: message.tenant_id,
        sessionId: (message.conversations as any)?.whatsapp_session_id,
        data: {
          messageId,
          status,
          error,
        },
        timestamp: new Date().toISOString(),
      })

      // Retry failed messages
      if (status === 'failed' && !error?.includes('max retries')) {
        await this.scheduleRetry(messageId)
      }
    } catch (error) {
      console.error('[DeliveryStatus] Error updating status:', error)
    }
  }

  /**
   * Batch update statuses
   */
  async batchUpdateStatus(updates: DeliveryUpdate[]): Promise<void> {
    for (const update of updates) {
      await this.updateStatus(update.messageId, update.status, update.error)
    }
  }

  /**
   * Schedule message retry
   */
  private async scheduleRetry(messageId: string): Promise<void> {
    try {
      const supabase = await createClient()

      // Get message retry count
      const { data: message } = await supabase
        .from('messages')
        .select('metadata')
        .eq('id', messageId)
        .single()

      const retryCount = (message?.metadata as any)?.retryCount || 0
      const maxRetries = 3

      if (retryCount >= maxRetries) {
        console.log(`[DeliveryStatus] Max retries reached for message ${messageId}`)
        await this.updateStatus(messageId, 'failed', 'Max retries reached')
        return
      }

      // Update retry count
      await supabase
        .from('messages')
        .update({
          metadata: { retryCount: retryCount + 1 },
        })
        .eq('id', messageId)

      // Queue for retry (delay based on retry count)
      const delay = Math.pow(2, retryCount) * 1000 // Exponential backoff: 1s, 2s, 4s
      
      console.log(`[DeliveryStatus] Scheduling retry ${retryCount + 1}/${maxRetries} for message ${messageId} in ${delay}ms`)

      // TODO: Queue message for retry
      // This would integrate with the queue system to resend the message
    } catch (error) {
      console.error('[DeliveryStatus] Error scheduling retry:', error)
    }
  }

  /**
   * Get delivery statistics
   */
  async getDeliveryStats(tenantId: string, timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<any> {
    try {
      const supabase = await createClient()

      // Calculate time range
      const now = new Date()
      const ranges = {
        hour: 60 * 60 * 1000,
        day: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
      }
      const startTime = new Date(now.getTime() - ranges[timeRange]).toISOString()

      // Get messages in time range
      const { data: messages, error } = await supabase
        .from('messages')
        .select('status, is_from_me')
        .eq('tenant_id', tenantId)
        .eq('is_from_me', true) // Only outgoing messages
        .gte('created_at', startTime)

      if (error) throw error

      const total = messages?.length || 0
      const sent = messages?.filter(m => m.status === 'sent').length || 0
      const delivered = messages?.filter(m => m.status === 'delivered').length || 0
      const read = messages?.filter(m => m.status === 'read').length || 0
      const failed = messages?.filter(m => m.status === 'failed').length || 0
      const pending = messages?.filter(m => m.status === 'pending').length || 0

      const deliveryRate = total > 0 ? ((delivered + read) / total * 100).toFixed(2) : '0'
      const readRate = total > 0 ? (read / total * 100).toFixed(2) : '0'
      const failureRate = total > 0 ? (failed / total * 100).toFixed(2) : '0'

      return {
        timeRange,
        total,
        byStatus: {
          pending,
          sent,
          delivered,
          read,
          failed,
        },
        rates: {
          delivery: `${deliveryRate}%`,
          read: `${readRate}%`,
          failure: `${failureRate}%`,
        },
      }
    } catch (error) {
      console.error('[DeliveryStatus] Error getting delivery stats:', error)
      return null
    }
  }

  /**
   * Get failed messages
   */
  async getFailedMessages(tenantId: string, limit: number = 50): Promise<any[]> {
    try {
      const supabase = await createClient()

      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          status,
          metadata,
          created_at,
          conversations!inner(
            id,
            contact_name,
            whatsapp_session_id
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return messages || []
    } catch (error) {
      console.error('[DeliveryStatus] Error getting failed messages:', error)
      return []
    }
  }

  /**
   * Get delivery timeline
   */
  async getDeliveryTimeline(messageId: string): Promise<any> {
    try {
      const supabase = await createClient()

      const { data: message, error } = await supabase
        .from('messages')
        .select('id, status, created_at, updated_at, metadata')
        .eq('id', messageId)
        .single()

      if (error) throw error

      // Build timeline from metadata or estimate
      const timeline = [
        {
          status: 'pending',
          timestamp: message.created_at,
        },
      ]

      if (message.status !== 'pending') {
        timeline.push({
          status: message.status,
          timestamp: message.updated_at,
        })
      }

      return {
        messageId,
        currentStatus: message.status,
        timeline,
      }
    } catch (error) {
      console.error('[DeliveryStatus] Error getting delivery timeline:', error)
      return null
    }
  }
}

// Singleton instance
export const deliveryStatusService = new DeliveryStatusService()

