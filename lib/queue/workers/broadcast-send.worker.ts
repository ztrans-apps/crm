/**
 * Broadcast Send Worker
 * Processes broadcast campaigns and sends messages to recipients
 */

import './load-env'; // Load environment variables first
import { createClient } from '@supabase/supabase-js';
import { Queue, Worker, Job } from 'bullmq';
import FormData from 'form-data';
import fetch from 'node-fetch';

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
  templateData?: any; // Full template data including header, footer, buttons
}

// Worker to process broadcast messages
const worker = new Worker<BroadcastJob>(
  'broadcast-send',
  async (job: Job<BroadcastJob>) => {
    const { campaignId, recipientId, phoneNumber, message, sessionId, templateData } = job.data;

    console.log(`📤 [Broadcast] Processing message for ${phoneNumber}`);

    try {
      // Update recipient status to sending
      await supabase
        .from('broadcast_recipients')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', recipientId);

      const whatsappServiceUrl = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';
      
      // Send message based on template format
      let result;
      
      if (templateData && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(templateData.header_format)) {
        // Template has media header
        const mediaUrl = templateData.header_media_url;
        
        if (mediaUrl && !mediaUrl.startsWith('placeholder_')) {
          
          try {
            // Download media from URL
            const mediaResponse = await fetch(mediaUrl);
            if (!mediaResponse.ok) {
              throw new Error(`Failed to download media: ${mediaResponse.statusText}`);
            }
            
            const mediaBuffer = await mediaResponse.buffer();
            const contentType = mediaResponse.headers.get('content-type') || 'image/jpeg';
            
            // Prepare caption with body only
            let caption = message;
            
            // Create form data
            const formData = new FormData();
            formData.append('sessionId', sessionId || 'default');
            formData.append('to', phoneNumber);
            formData.append('media', mediaBuffer, {
              filename: 'media.' + (contentType.split('/')[1] || 'jpg'),
              contentType: contentType,
            });
            formData.append('caption', caption);
            formData.append('mimetype', contentType);
            
            // Send media message
            const response = await fetch(`${whatsappServiceUrl}/api/whatsapp/send-media`, {
              method: 'POST',
              body: formData,
              headers: formData.getHeaders(),
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`   ✗ WhatsApp service error: ${errorText}`);
              throw new Error(`WhatsApp service error: ${response.statusText}`);
            }
            
            result = await response.json();
            
            // Send footer and buttons as separate text message
            if (templateData.footer_text || (templateData.buttons && templateData.buttons.length > 0)) {
              let followUpMessage = '';
              
              // Add buttons first
              if (templateData.buttons && templateData.buttons.length > 0) {
                templateData.buttons.forEach((btn: any, idx: number) => {
                  if (btn.type === 'QUICK_REPLY') {
                    followUpMessage += `${idx + 1}. ${btn.text}\n`;
                  } else if (btn.type === 'URL') {
                    followUpMessage += `🔗 ${btn.text}: ${btn.value}\n`;
                  } else if (btn.type === 'PHONE_NUMBER') {
                    followUpMessage += `📞 ${btn.text}: ${btn.value}\n`;
                  }
                });
              }
              
              // Add footer at the bottom
              if (templateData.footer_text) {
                if (followUpMessage) followUpMessage += '\n';
                followUpMessage += `_${templateData.footer_text}_`;
              }
              
              if (followUpMessage.trim()) {
                const followUpResponse = await fetch(`${whatsappServiceUrl}/api/whatsapp/send`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    sessionId: sessionId || 'default',
                    to: phoneNumber,
                    message: followUpMessage.trim(),
                  }),
                });
                
                if (!followUpResponse.ok) {
                }
              }
            }
            
          } catch (mediaError: any) {
            console.error(`Failed to send media: ${mediaError.message}`);
            // Fallback to text message
            result = await sendTextMessage(whatsappServiceUrl, sessionId, phoneNumber, message, templateData);
          }
        } else {
          // No valid media URL, send as text
          result = await sendTextMessage(whatsappServiceUrl, sessionId, phoneNumber, message, templateData);
        }
      } else {
        // No media header, send as text message
        result = await sendTextMessage(whatsappServiceUrl, sessionId, phoneNumber, message, templateData);
      }

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
            message_type: templateData?.header_format === 'IMAGE' ? 'image' : 
                         templateData?.header_format === 'VIDEO' ? 'video' : 
                         templateData?.header_format === 'DOCUMENT' ? 'document' : 'text',
            delivery_status: 'sent',
            metadata: {
              broadcast_campaign_id: campaignId,
              broadcast_recipient_id: recipientId,
              template_data: templateData,
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

// Helper function to send text message
async function sendTextMessage(
  whatsappServiceUrl: string, 
  sessionId: string | undefined, 
  phoneNumber: string, 
  message: string,
  templateData: any
) {
  // Prepare message with full formatting
  let fullMessage = '';
  
  // Add header (TEXT only, not media URL)
  if (templateData?.header_format === 'TEXT' && templateData?.header_text) {
    fullMessage = `*${templateData.header_text}*\n\n`;
  }
  
  // Add body
  fullMessage += message;
  
  // Add buttons first
  if (templateData?.buttons && templateData.buttons.length > 0) {
    fullMessage += '\n\n';
    templateData.buttons.forEach((btn: any, idx: number) => {
      if (btn.type === 'QUICK_REPLY') {
        fullMessage += `\n${idx + 1}. ${btn.text}`;
      } else if (btn.type === 'URL') {
        fullMessage += `\n🔗 ${btn.text}: ${btn.value}`;
      } else if (btn.type === 'PHONE_NUMBER') {
        fullMessage += `\n📞 ${btn.text}: ${btn.value}`;
      }
    });
  }
  
  // Add footer at the bottom
  if (templateData?.footer_text) {
    fullMessage += `\n\n_${templateData.footer_text}_`;
  }
  
  const response = await fetch(`${whatsappServiceUrl}/api/whatsapp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sessionId || 'default',
      to: phoneNumber,
      message: fullMessage,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`   ✗ WhatsApp service error: ${errorText}`);
    throw new Error(`WhatsApp service error: ${response.statusText} - ${errorText}`);
  }

  return await response.json();
}

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

    // Get template data from campaign metadata
    const templateData = campaign.metadata?.template_data || null;
    console.log(`   Template data: ${templateData ? 'Available' : 'Not available'}`);

    // Queue each recipient
    const jobs = recipients.map((recipient) => ({
      name: `broadcast-${campaignId}-${recipient.id}`,
      data: {
        campaignId,
        recipientId: recipient.id,
        phoneNumber: recipient.phone_number,
        message: campaign.message_template,
        sessionId: campaign.metadata?.whatsapp_account || campaign.whatsapp_session_id,
        templateData: templateData, // Pass template data
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
