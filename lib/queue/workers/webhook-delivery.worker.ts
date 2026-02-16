/**
 * Webhook Delivery Worker
 * Processes webhook delivery jobs
 */

import { Worker, Job } from 'bullmq'
import { redisConnection } from '../config'
import { webhookRouter } from '@/lib/services/webhook-router.service'

interface WebhookDeliveryJob {
  webhookId: string
  webhook: any
  event: any
}

// Create worker
const worker = new Worker<WebhookDeliveryJob>(
  'webhook-delivery',
  async (job: Job<WebhookDeliveryJob>) => {
    const { webhookId, webhook, event } = job.data
    const attemptNumber = job.attemptsMade + 1

    console.log(`[WebhookWorker] Processing delivery for webhook: ${webhook.name} (attempt ${attemptNumber})`)

    try {
      const result = await webhookRouter.deliverWebhook(
        webhookId,
        webhook,
        event,
        attemptNumber
      )

      if (!result.success) {
        throw new Error(result.error || `HTTP ${result.statusCode}`)
      }

      console.log(`[WebhookWorker] Successfully delivered webhook: ${webhook.name} (${result.duration}ms)`)

      return result
    } catch (error: any) {
      console.error(`[WebhookWorker] Failed to deliver webhook: ${webhook.name}`, error)
      throw error // Will trigger retry
    }
  },
  {
    connection: redisConnection,
    concurrency: 10, // Process 10 webhooks concurrently
  }
)

// Event handlers
worker.on('completed', (job) => {
  console.log(`[WebhookWorker] Job ${job.id} completed`)
})

worker.on('failed', (job, err) => {
  console.error(`[WebhookWorker] Job ${job?.id} failed:`, err.message)
})

worker.on('error', (err) => {
  console.error('[WebhookWorker] Worker error:', err)
})

console.log('[WebhookWorker] Webhook delivery worker started')

export default worker

