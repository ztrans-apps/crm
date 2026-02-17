/**
 * Broadcast Send Worker
 * Processes broadcast campaigns and sends messages to recipients
 */

import './load-env'; // Load environment variables first
import { createClient } from '@supabase/supabase-js';
import { Queue, Worker, Job } from 'bullmq';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Redis connection options
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
};

// Broadcast queue
export const broadcastQueue = new Queue('broadcast-send', { connection });

interface BroadcastJob {
  campaignId: string;
  recipientId: string;
  phoneNumber: string;
  message: string;
  sessionId?: string;
}

// Worker to process broadcast messages
const worker = new Worker<BroadcastJob>(
  'broadcast-send',
  async (job: Job<BroadcastJob>) => {
    const { campaignId, recipientId, phoneNumber, message, sessionId } = job.data;

    console.log(`📤 [Broadcast] Processing message for ${phoneNumber}`);
    console.log(`   Campaign: ${campaignId}`);
    console.log(`   Recipient: ${recipientId}`);
    console.log(`   Session: ${sessionId || 'default'}`);

    try {
      // Update recipient status to sending
      await supabase
        .from('broadcast_recipients')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', recipientId);

      console.log(`   ✓ Updated recipient status to 'sent'`);

      // Send message via WhatsApp service
      const whatsappServiceUrl = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';
      
      console.log(`   → Sending to WhatsApp service: ${whatsappServiceUrl}`);
      
      const response = await fetch(`${whatsappServiceUrl}/api/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId || 'default',
          to: phoneNumber,
          message: message,
        }),
      });

      console.log(`   ← WhatsApp service response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`   ✗ WhatsApp service error: ${errorText}`);
        throw new Error(`WhatsApp service error: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`   ✓ Message sent successfully:`, result);

      // Create message record
      const { data: contact } = await supabase
        .from('contacts')
        .select('id')
        .eq('phone_number', phoneNumber)
        .single();

      if (contact) {
        const { data: messageRecord } = await supabase
          .from('messages')
          .insert({
            conversation_id: null, // Broadcast messages don't have conversations
            sender_type: 'agent',
            sender_id: null,
            content: message,
            message_type: 'text',
            delivery_status: 'sent',
            metadata: {
              broadcast_campaign_id: campaignId,
              broadcast_recipient_id: recipientId,
            },
          })
          .select()
          .single();

        // Update recipient with message_id
        if (messageRecord) {
          await supabase
            .from('broadcast_recipients')
            .update({
              message_id: messageRecord.id,
              status: 'sent',
            })
            .eq('id', recipientId);
          
          console.log(`   ✓ Message record created: ${messageRecord.id}`);
        }
      }

      console.log(`✅ [Broadcast] Message sent to ${phoneNumber}`);
      return { success: true, messageId: result.messageId };

    } catch (error: any) {
      console.error(`❌ [Broadcast] Failed to send to ${phoneNumber}:`, error.message);
      console.error(`   Stack:`, error.stack);

      // Update recipient status to failed
      await supabase
        .from('broadcast_recipients')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          error_message: error.message,
          retry_count: job.attemptsMade,
        })
        .eq('id', recipientId);

      throw error; // Re-throw to trigger retry
    }
  },
  {
    connection,
    concurrency: parseInt(process.env.BROADCAST_CONCURRENCY || '5'),
    limiter: {
      max: 10, // Max 10 messages
      duration: 1000, // Per second (to avoid WhatsApp rate limits)
    },
  }
);

// Worker event handlers
worker.on('completed', async (job) => {
  console.log(`✅ Broadcast job ${job.id} completed`);
  
  // Check if campaign is complete
  if (job.data.campaignId) {
    await checkCampaignCompletion(job.data.campaignId);
  }
});

worker.on('failed', async (job, err) => {
  console.error(`❌ Broadcast job ${job?.id} failed:`, err.message);
  
  // Check if campaign is complete (even with failures)
  if (job?.data.campaignId) {
    await checkCampaignCompletion(job.data.campaignId);
  }
});

worker.on('error', (err) => {
  console.error('❌ Broadcast worker error:', err);
});

// Function to queue broadcast campaign
export async function queueBroadcastCampaign(campaignId: string) {
  console.log(`📋 Queuing broadcast campaign: ${campaignId}`);

  try {
    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('broadcast_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error('Campaign not found');
    }

    // Update campaign status
    await supabase
      .from('broadcast_campaigns')
      .update({
        status: 'sending',
        started_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    // Get all pending recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from('broadcast_recipients')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending');

    if (recipientsError || !recipients || recipients.length === 0) {
      throw new Error('No pending recipients found');
    }

    console.log(`📤 Queuing ${recipients.length} messages for campaign ${campaignId}`);

    // Queue each recipient
    const jobs = recipients.map((recipient) => ({
      name: `broadcast-${campaignId}-${recipient.id}`,
      data: {
        campaignId,
        recipientId: recipient.id,
        phoneNumber: recipient.phone_number,
        message: campaign.message_template,
        sessionId: campaign.metadata?.whatsapp_account || campaign.whatsapp_session_id,
      },
      opts: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }));

    await broadcastQueue.addBulk(jobs);

    console.log(`✅ Queued ${jobs.length} broadcast messages`);

    return { success: true, queuedCount: jobs.length };

  } catch (error: any) {
    console.error('❌ Failed to queue broadcast campaign:', error);

    // Update campaign status to failed
    await supabase
      .from('broadcast_campaigns')
      .update({
        status: 'failed',
      })
      .eq('id', campaignId);

    throw error;
  }
}

// Function to check campaign completion
export async function checkCampaignCompletion(campaignId: string) {
  try {
    const { data: recipients } = await supabase
      .from('broadcast_recipients')
      .select('status')
      .eq('campaign_id', campaignId);

    if (!recipients || recipients.length === 0) {
      console.log(`⚠️ No recipients found for campaign ${campaignId}`);
      return;
    }

    const pending = recipients.filter((r) => r.status === 'pending').length;
    const sent = recipients.filter((r) => r.status === 'sent').length;
    const delivered = recipients.filter((r) => r.status === 'delivered').length;
    const read = recipients.filter((r) => r.status === 'read').length;
    const failed = recipients.filter((r) => r.status === 'failed').length;
    const total = recipients.length;

    console.log(`📊 Campaign ${campaignId} status: ${sent} sent, ${delivered} delivered, ${read} read, ${failed} failed, ${pending} pending (total: ${total})`);

    // If all messages processed (no pending), mark campaign as completed
    if (pending === 0) {
      const finalStatus = failed === total ? 'failed' : 'completed';
      
      await supabase
        .from('broadcast_campaigns')
        .update({
          status: finalStatus,
          completed_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      console.log(`✅ Campaign ${campaignId} marked as ${finalStatus}`);
    }
  } catch (error) {
    console.error(`❌ Error checking campaign completion:`, error);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 Shutting down broadcast worker...');
  await worker.close();
  process.exit(0);
});

export default worker;
