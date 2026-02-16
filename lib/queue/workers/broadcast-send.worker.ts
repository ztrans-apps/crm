/**
 * Broadcast Send Worker
 * Processes broadcast message sending
 */

import { Worker, Job } from 'bullmq'
import { redisConnection } from '../config'
import { broadcastService } from '@/lib/services/broadcast.service'

interface BroadcastSendJob {
  messageId: string
  campaignId: string
  tenantId: string
  contactId: string
  phoneNumber: string
  content: string
  mediaUrl?: string
}

// Create worker
const worker = new Worker<BroadcastSendJob>(
  'broadcast-send',
  async (job: Job<BroadcastSendJob>) => {
    const { messageId, campaignId, tenantId, phoneNumber, content, mediaUrl } = job.data

    console.log(`[BroadcastWorker] Sending message ${messageId} to ${phoneNumber}`)

    try {
      // Get best session for tenant
      const sessionResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/sessions/${tenantId}/best`
      )

      if (!sessionResponse.ok) {
        throw new Error('No active WhatsApp session available')
      }

      const { session } = await sessionResponse.json()

      // Send message via WhatsApp service
      const whatsappServiceUrl = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001'
      const sendResponse = await fetch(`${whatsappServiceUrl}/api/whatsapp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.sessionId,
          to: phoneNumber,
          message: content,
          mediaUrl,
        }),
      })

      if (!sendResponse.ok) {
        const error = await sendResponse.json()
        throw new Error(error.error || 'Failed to send message')
      }

      const { messageId: whatsappMessageId } = await sendResponse.json()

      // Update message status
      await broadcastService.updateMessageStatus(messageId, 'sent', whatsappMessageId)

      console.log(`[BroadcastWorker] Successfully sent message ${messageId}`)

      return { success: true, whatsappMessageId }
    } catch (error: any) {
      console.error(`[BroadcastWorker] Failed to send message ${messageId}:`, error)

      // Update message status to failed
      await broadcastService.updateMessageStatus(messageId, 'failed', undefined, error.message)

      throw error // Will trigger retry
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process 5 messages concurrently
  }
)

// Event handlers
worker.on('completed', (job) => {
  console.log(`[BroadcastWorker] Job ${job.id} completed`)
})

worker.on('failed', (job, err) => {
  console.error(`[BroadcastWorker] Job ${job?.id} failed:`, err.message)
})

worker.on('error', (err) => {
  console.error('[BroadcastWorker] Worker error:', err)
})

console.log('[BroadcastWorker] Broadcast send worker started')

export default worker

