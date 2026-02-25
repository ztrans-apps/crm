/**
 * Cron: Process Broadcast Campaigns (Vercel-compatible)
 * 
 * Runs every minute via Vercel Cron to:
 * 1. Check for scheduled campaigns that are due
 * 2. Process pending recipients in batches (send via Meta Cloud API)
 * 3. Mark campaigns as completed when all recipients are processed
 * 
 * No Redis/BullMQ required - uses Supabase as the job queue.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getMetaCloudAPIForPhoneNumberId, getMetaCloudAPI } from '@/lib/whatsapp/meta-api';

const BATCH_SIZE = 30; // Recipients per cron invocation (stay within Vercel timeout)
const META_API_TOKEN = process.env.WHATSAPP_API_TOKEN || '';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Send a message via Meta Cloud API for a specific phone number ID.
 * If no phoneNumberId is provided, falls back to default env.
 */
async function metaSend(body: any, phoneNumberId?: string): Promise<any> {
  const api = phoneNumberId
    ? getMetaCloudAPIForPhoneNumberId(phoneNumberId)
    : getMetaCloudAPI();

  // Use the internal sendRaw method (send pre-built body)
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';
  const pnid = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  const url = `https://graph.facebook.com/${apiVersion}/${pnid}/messages`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${META_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Meta API: ${(data as any)?.error?.message || `HTTP ${response.status}`}`);
  }
  return data;
}

/**
 * Send text message with template formatting
 */
async function sendFormattedText(phone: string, message: string, templateData: any, phoneNumberId?: string): Promise<string | null> {
  let fullMessage = '';

  if (templateData?.header_format === 'TEXT' && templateData?.header_text) {
    fullMessage = `*${templateData.header_text}*\n\n`;
  }

  fullMessage += message;

  if (templateData?.buttons?.length > 0) {
    fullMessage += '\n\n';
    templateData.buttons.forEach((btn: any, idx: number) => {
      if (btn.type === 'QUICK_REPLY') fullMessage += `\n${idx + 1}. ${btn.text}`;
      else if (btn.type === 'URL') fullMessage += `\n🔗 ${btn.text}: ${btn.value}`;
      else if (btn.type === 'PHONE_NUMBER') fullMessage += `\n📞 ${btn.text}: ${btn.value}`;
    });
  }

  if (templateData?.footer_text) {
    fullMessage += `\n\n_${templateData.footer_text}_`;
  }

  const data = await metaSend({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'text',
    text: { preview_url: true, body: fullMessage },
  }, phoneNumberId);

  return data.messages?.[0]?.id || null;
}

/**
 * Send media message
 */
async function sendMediaMessage(phone: string, message: string, templateData: any, phoneNumberId?: string): Promise<string | null> {
  const mediaUrl = templateData.header_media_url;
  const contentType = templateData.header_format === 'IMAGE' ? 'image' :
                     templateData.header_format === 'VIDEO' ? 'video' : 'document';

  const mediaPayload: any = { link: mediaUrl };
  if (message) mediaPayload.caption = message;
  if (contentType === 'document') {
    mediaPayload.filename = templateData.header_filename || 'document';
  }

  const body: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: contentType,
  };
  body[contentType] = mediaPayload;

  const data = await metaSend(body, phoneNumberId);
  return data.messages?.[0]?.id || null;
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (Vercel sets this header for cron jobs)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const defaultPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    if (!defaultPhoneNumberId || !META_API_TOKEN) {
      return NextResponse.json({ error: 'WhatsApp API not configured' }, { status: 500 });
    }

    const supabase = getSupabase();
    const now = new Date().toISOString();
    let processed = 0;
    let failed = 0;
    let campaignsActivated = 0;

    // ─── Step 1: Activate scheduled campaigns that are due ───
    const { data: scheduledCampaigns } = await supabase
      .from('broadcast_campaigns')
      .select('id, name')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now);

    if (scheduledCampaigns?.length) {
      for (const campaign of scheduledCampaigns) {
        await supabase
          .from('broadcast_campaigns')
          .update({ status: 'sending', started_at: now })
          .eq('id', campaign.id);
        campaignsActivated++;
      }
    }

    // ─── Step 2: Get campaigns that are actively sending ───
    const { data: activeCampaigns } = await supabase
      .from('broadcast_campaigns')
      .select('id, message_template, metadata, session_id')
      .eq('status', 'sending');

    if (!activeCampaigns?.length) {
      return NextResponse.json({
        success: true,
        message: 'No active campaigns',
        campaignsActivated,
        processed: 0,
      });
    }

    // ─── Step 3: Process pending recipients in batches ───
    for (const campaign of activeCampaigns) {
      const templateData = campaign.metadata?.template_data || null;
      const messageTemplate = campaign.message_template || '';

      // Resolve which phone number ID to use for this campaign
      let campaignPhoneNumberId = defaultPhoneNumberId;
      if (campaign.session_id) {
        const { data: session } = await supabase
          .from('whatsapp_sessions')
          .select('meta_phone_number_id')
          .eq('id', campaign.session_id)
          .single();
        if (session?.meta_phone_number_id) {
          campaignPhoneNumberId = session.meta_phone_number_id;
        }
      }

      // Fetch a batch of pending recipients
      const { data: recipients } = await supabase
        .from('broadcast_recipients')
        .select('id, phone_number, contact_id')
        .eq('campaign_id', campaign.id)
        .eq('status', 'pending')
        .limit(BATCH_SIZE);

      if (!recipients?.length) {
        // No more pending — check if campaign is complete
        await checkCompletion(supabase, campaign.id);
        continue;
      }

      // Process each recipient
      for (const recipient of recipients) {
        const phone = recipient.phone_number.replace(/\D/g, '');

        try {
          let waMessageId: string | null = null;

          // Determine message type
          const hasMedia = templateData &&
            ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(templateData.header_format) &&
            templateData.header_media_url &&
            !templateData.header_media_url.startsWith('placeholder_');

          if (hasMedia) {
            try {
              waMessageId = await sendMediaMessage(phone, messageTemplate, templateData, campaignPhoneNumberId);
            } catch {
              // Fallback to text
              waMessageId = await sendFormattedText(phone, messageTemplate, templateData, campaignPhoneNumberId);
            }
          } else {
            waMessageId = await sendFormattedText(phone, messageTemplate, templateData, campaignPhoneNumberId);
          }

          // Mark as sent
          await supabase
            .from('broadcast_recipients')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              whatsapp_message_id: waMessageId,
            })
            .eq('id', recipient.id);

          processed++;
        } catch (error: any) {
          // Mark as failed
          await supabase
            .from('broadcast_recipients')
            .update({
              status: 'failed',
              failed_at: new Date().toISOString(),
              error_message: error.message?.substring(0, 500),
            })
            .eq('id', recipient.id);

          failed++;
        }

        // Small delay to respect rate limits (max ~80 msgs/sec for Meta API)
        await new Promise(r => setTimeout(r, 100));
      }

      // Check if campaign is now complete
      await checkCompletion(supabase, campaign.id);
    }

    return NextResponse.json({
      success: true,
      campaignsActivated,
      processed,
      failed,
      timestamp: now,
    });
  } catch (error: any) {
    console.error('[Cron:Broadcast] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function checkCompletion(supabase: any, campaignId: string) {
  const { data: recipients } = await supabase
    .from('broadcast_recipients')
    .select('status')
    .eq('campaign_id', campaignId);

  if (!recipients?.length) return;

  const pending = recipients.filter((r: any) => r.status === 'pending').length;
  const failedCount = recipients.filter((r: any) => r.status === 'failed').length;

  if (pending === 0) {
    const finalStatus = failedCount === recipients.length ? 'failed' : 'completed';
    await supabase
      .from('broadcast_campaigns')
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
      })
      .eq('id', campaignId);
  }
}
