/**
 * Broadcast Campaign Scheduler
 * Checks for scheduled campaigns and triggers them at the right time
 */

import { createClient } from '@supabase/supabase-js';
import { queueBroadcastCampaign } from '../workers/broadcast-send.worker';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Check and process scheduled campaigns
 */
export async function processScheduledCampaigns() {
  try {
    const now = new Date();
    const nowISO = now.toISOString();
    
    console.log(`📅 [Scheduler] Checking for scheduled campaigns at ${now.toLocaleString('id-ID')}`);
    console.log(`   Current time (ISO): ${nowISO}`);

    // Get campaigns that are scheduled and due to be sent
    const { data: campaigns, error } = await supabase
      .from('broadcast_campaigns')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', nowISO);

    if (error) {
      console.error('❌ [Scheduler] Error fetching scheduled campaigns:', error);
      return;
    }

    if (!campaigns || campaigns.length === 0) {
      console.log('   No campaigns ready to send');
      return;
    }

    console.log(`📅 [Scheduler] Found ${campaigns.length} scheduled campaign(s) ready to send`);

    // Process each campaign
    for (const campaign of campaigns) {
      try {
        console.log(`🚀 [Scheduler] Starting scheduled campaign: ${campaign.name} (${campaign.id})`);
        console.log(`   Scheduled for: ${campaign.scheduled_at}`);
        console.log(`   Current time: ${nowISO}`);
        
        await queueBroadcastCampaign(campaign.id);
        
        console.log(`✅ [Scheduler] Campaign ${campaign.name} queued successfully`);
      } catch (error) {
        console.error(`❌ [Scheduler] Failed to queue campaign ${campaign.id}:`, error);
        
        // Update campaign status to failed
        await supabase
          .from('broadcast_campaigns')
          .update({
            status: 'failed',
            metadata: {
              ...campaign.metadata,
              error_message: error instanceof Error ? error.message : 'Unknown error',
            },
          })
          .eq('id', campaign.id);
      }
    }
  } catch (error) {
    console.error('❌ [Scheduler] Error in processScheduledCampaigns:', error);
  }
}

/**
 * Start the scheduler
 * Runs every minute to check for scheduled campaigns
 */
export function startBroadcastScheduler() {
  console.log('📅 Starting broadcast campaign scheduler...');
  
  // Run immediately
  processScheduledCampaigns();
  
  // Then run every minute
  const interval = setInterval(() => {
    processScheduledCampaigns();
  }, 60 * 1000); // Every 1 minute

  // Cleanup on exit
  process.on('SIGTERM', () => {
    console.log('📴 Stopping broadcast scheduler...');
    clearInterval(interval);
  });

  return interval;
}
