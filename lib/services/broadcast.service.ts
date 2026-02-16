/**
 * Broadcast Service
 * Manage broadcast campaigns and message delivery
 */

import { createClient } from '@/lib/supabase/server'
import { queueManager } from '@/lib/queue/queue-manager'

export interface BroadcastCampaign {
  id: string
  tenant_id: string
  name: string
  description?: string
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed' | 'paused'
  message_template: string
  media_url?: string
  media_type?: string
  scheduled_at?: string
  target_type: 'all' | 'segment' | 'custom' | 'labels'
  target_labels?: string[]
  target_contacts?: string[]
  total_recipients: number
  sent_count: number
  delivered_count: number
  read_count: number
  failed_count: number
  send_rate: number
  retry_failed: boolean
}

class BroadcastService {
  /**
   * Create broadcast campaign
   */
  async createCampaign(
    tenantId: string,
    data: {
      name: string
      description?: string
      message_template: string
      media_url?: string
      media_type?: string
      scheduled_at?: string
      target_type: string
      target_labels?: string[]
      target_contacts?: string[]
      send_rate?: number
      retry_failed?: boolean
    },
    createdBy: string
  ): Promise<BroadcastCampaign> {
    try {
      const supabase = await createClient()

      // Calculate total recipients
      const totalRecipients = await this.calculateRecipients(
        tenantId,
        data.target_type,
        data.target_labels,
        data.target_contacts
      )

      const { data: campaign, error } = await supabase
        .from('broadcast_campaigns')
        .insert({
          tenant_id: tenantId,
          ...data,
          total_recipients: totalRecipients,
          created_by: createdBy,
        })
        .select()
        .single()

      if (error) throw error

      return campaign
    } catch (error) {
      console.error('[BroadcastService] Error creating campaign:', error)
      throw error
    }
  }

  /**
   * Calculate number of recipients
   */
  private async calculateRecipients(
    tenantId: string,
    targetType: string,
    targetLabels?: string[],
    targetContacts?: string[]
  ): Promise<number> {
    try {
      const supabase = await createClient()

      if (targetType === 'custom' && targetContacts) {
        return targetContacts.length
      }

      let query = supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)

      if (targetType === 'labels' && targetLabels && targetLabels.length > 0) {
        // Get contacts with any of the specified labels
        const { data: contactLabels } = await supabase
          .from('contact_labels')
          .select('contact_id')
          .in('label_id', targetLabels)

        const contactIds = [...new Set(contactLabels?.map(cl => cl.contact_id) || [])]
        query = query.in('id', contactIds)
      }

      const { count } = await query

      return count || 0
    } catch (error) {
      console.error('[BroadcastService] Error calculating recipients:', error)
      return 0
    }
  }

  /**
   * Get recipients for campaign
   */
  private async getRecipients(
    tenantId: string,
    targetType: string,
    targetLabels?: string[],
    targetContacts?: string[]
  ): Promise<any[]> {
    try {
      const supabase = await createClient()

      if (targetType === 'custom' && targetContacts) {
        const { data } = await supabase
          .from('contacts')
          .select('*')
          .eq('tenant_id', tenantId)
          .in('id', targetContacts)

        return data || []
      }

      let query = supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', tenantId)

      if (targetType === 'labels' && targetLabels && targetLabels.length > 0) {
        const { data: contactLabels } = await supabase
          .from('contact_labels')
          .select('contact_id')
          .in('label_id', targetLabels)

        const contactIds = [...new Set(contactLabels?.map(cl => cl.contact_id) || [])]
        query = query.in('id', contactIds)
      }

      const { data } = await query

      return data || []
    } catch (error) {
      console.error('[BroadcastService] Error getting recipients:', error)
      return []
    }
  }

  /**
   * Start campaign (send messages)
   */
  async startCampaign(campaignId: string): Promise<void> {
    try {
      const supabase = await createClient()

      // Get campaign
      const { data: campaign, error } = await supabase
        .from('broadcast_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()

      if (error || !campaign) {
        throw new Error('Campaign not found')
      }

      // Update status to sending
      await supabase
        .from('broadcast_campaigns')
        .update({
          status: 'sending',
          started_at: new Date().toISOString(),
        })
        .eq('id', campaignId)

      // Get recipients
      const recipients = await this.getRecipients(
        campaign.tenant_id,
        campaign.target_type,
        campaign.target_labels,
        campaign.target_contacts
      )

      console.log(`[BroadcastService] Starting campaign ${campaignId} for ${recipients.length} recipients`)

      // Create broadcast messages
      const messages = recipients.map(contact => ({
        campaign_id: campaignId,
        tenant_id: campaign.tenant_id,
        contact_id: contact.id,
        phone_number: contact.phone_number,
        message_content: this.personalizeMessage(campaign.message_template, contact),
        media_url: campaign.media_url,
        status: 'pending',
      }))

      // Insert messages in batches
      const batchSize = 100
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize)
        await supabase.from('broadcast_messages').insert(batch)
      }

      // Queue messages for sending
      await this.queueMessages(campaignId, campaign.send_rate)
    } catch (error) {
      console.error('[BroadcastService] Error starting campaign:', error)
      throw error
    }
  }

  /**
   * Personalize message with contact data
   */
  private personalizeMessage(template: string, contact: any): string {
    let message = template

    // Replace placeholders
    message = message.replace(/\{\{name\}\}/g, contact.name || contact.phone_number)
    message = message.replace(/\{\{phone\}\}/g, contact.phone_number)
    message = message.replace(/\{\{email\}\}/g, contact.email || '')

    return message
  }

  /**
   * Queue messages for sending
   */
  private async queueMessages(campaignId: string, sendRate: number): Promise<void> {
    try {
      const supabase = await createClient()

      // Get pending messages
      const { data: messages } = await supabase
        .from('broadcast_messages')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      if (!messages || messages.length === 0) {
        return
      }

      const queue = queueManager.getQueue('broadcast-send')

      // Calculate delay between messages based on send rate
      const delayMs = (60 * 1000) / sendRate // Convert rate per minute to delay in ms

      // Queue messages with staggered delays
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i]
        const delay = i * delayMs

        await queue.add(
          'send',
          {
            messageId: message.id,
            campaignId: message.campaign_id,
            tenantId: message.tenant_id,
            contactId: message.contact_id,
            phoneNumber: message.phone_number,
            content: message.message_content,
            mediaUrl: message.media_url,
          },
          {
            delay,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          }
        )

        // Update status to queued
        await supabase
          .from('broadcast_messages')
          .update({ status: 'queued' })
          .eq('id', message.id)
      }

      console.log(`[BroadcastService] Queued ${messages.length} messages for campaign ${campaignId}`)
    } catch (error) {
      console.error('[BroadcastService] Error queuing messages:', error)
    }
  }

  /**
   * Update message status
   */
  async updateMessageStatus(
    messageId: string,
    status: string,
    whatsappMessageId?: string,
    error?: string
  ): Promise<void> {
    try {
      const supabase = await createClient()

      const updates: any = {
        status,
        [`${status}_at`]: new Date().toISOString(),
      }

      if (whatsappMessageId) {
        updates.whatsapp_message_id = whatsappMessageId
      }

      if (error) {
        updates.error_message = error
      }

      await supabase
        .from('broadcast_messages')
        .update(updates)
        .eq('id', messageId)

      // Update campaign statistics
      await this.updateCampaignStats(messageId)
    } catch (error) {
      console.error('[BroadcastService] Error updating message status:', error)
    }
  }

  /**
   * Update campaign statistics
   */
  private async updateCampaignStats(messageId: string): Promise<void> {
    try {
      const supabase = await createClient()

      // Get message to find campaign
      const { data: message } = await supabase
        .from('broadcast_messages')
        .select('campaign_id')
        .eq('id', messageId)
        .single()

      if (!message) return

      // Count messages by status
      const { data: stats } = await supabase
        .from('broadcast_messages')
        .select('status')
        .eq('campaign_id', message.campaign_id)

      const sentCount = stats?.filter(s => ['sent', 'delivered', 'read'].includes(s.status)).length || 0
      const deliveredCount = stats?.filter(s => ['delivered', 'read'].includes(s.status)).length || 0
      const readCount = stats?.filter(s => s.status === 'read').length || 0
      const failedCount = stats?.filter(s => s.status === 'failed').length || 0

      // Update campaign
      await supabase
        .from('broadcast_campaigns')
        .update({
          sent_count: sentCount,
          delivered_count: deliveredCount,
          read_count: readCount,
          failed_count: failedCount,
        })
        .eq('id', message.campaign_id)

      // Check if campaign is completed
      const totalMessages = stats?.length || 0
      const completedMessages = sentCount + failedCount

      if (completedMessages >= totalMessages) {
        await supabase
          .from('broadcast_campaigns')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', message.campaign_id)
      }
    } catch (error) {
      console.error('[BroadcastService] Error updating campaign stats:', error)
    }
  }

  /**
   * Pause campaign
   */
  async pauseCampaign(campaignId: string): Promise<void> {
    try {
      const supabase = await createClient()

      await supabase
        .from('broadcast_campaigns')
        .update({ status: 'paused' })
        .eq('id', campaignId)

      // TODO: Remove pending jobs from queue
    } catch (error) {
      console.error('[BroadcastService] Error pausing campaign:', error)
      throw error
    }
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(campaignId: string): Promise<any> {
    try {
      const supabase = await createClient()

      const { data: campaign } = await supabase
        .from('broadcast_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()

      if (!campaign) return null

      const deliveryRate = campaign.total_recipients > 0
        ? ((campaign.delivered_count / campaign.total_recipients) * 100).toFixed(2)
        : '0'

      const readRate = campaign.total_recipients > 0
        ? ((campaign.read_count / campaign.total_recipients) * 100).toFixed(2)
        : '0'

      const failureRate = campaign.total_recipients > 0
        ? ((campaign.failed_count / campaign.total_recipients) * 100).toFixed(2)
        : '0'

      return {
        ...campaign,
        rates: {
          delivery: `${deliveryRate}%`,
          read: `${readRate}%`,
          failure: `${failureRate}%`,
        },
        progress: campaign.total_recipients > 0
          ? Math.round(((campaign.sent_count + campaign.failed_count) / campaign.total_recipients) * 100)
          : 0,
      }
    } catch (error) {
      console.error('[BroadcastService] Error getting campaign stats:', error)
      return null
    }
  }
}

// Singleton instance
export const broadcastService = new BroadcastService()

