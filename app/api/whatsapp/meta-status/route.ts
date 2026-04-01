/**
 * WhatsApp Meta Cloud API Status
 * Returns current API configuration status and phone number info
 * Now checks active sessions from database instead of just ENV
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';
import { getMetaCloudAPI, MetaCloudAPI } from '@/lib/whatsapp/meta-api';

export const GET = withAuth(async (req, ctx) => {
  // Try to get active session from database first
  let metaApi: MetaCloudAPI;
  let sessionId: string | null = null;

  try {
    const { data: activeSession } = await ctx.supabase
      .from('whatsapp_sessions')
      .select('id, meta_phone_number_id, meta_api_token, meta_business_account_id, meta_api_version')
      .eq('tenant_id', ctx.tenantId)
      .eq('is_active', true)
      .eq('status', 'connected')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (activeSession?.meta_phone_number_id && activeSession?.meta_api_token) {
      // Use session-specific configuration from database
      sessionId = activeSession.id;
      metaApi = new MetaCloudAPI({
        phoneNumberId: activeSession.meta_phone_number_id,
        apiToken: activeSession.meta_api_token,
        businessAccountId: activeSession.meta_business_account_id,
        apiVersion: activeSession.meta_api_version || 'v21.0',
      });
    } else {
      // Fallback to ENV configuration
      metaApi = getMetaCloudAPI();
    }
  } catch (error) {
    console.error('[Meta Status] Error fetching active session:', error);
    // Fallback to ENV configuration
    metaApi = getMetaCloudAPI();
  }

  if (!metaApi.isConfigured()) {
    return NextResponse.json({
      configured: false,
      error: 'Meta Cloud API not configured. Add a WhatsApp session with Meta credentials or set ENV variables.',
    });
  }

  // Fetch phone number info from Meta API
  try {
    const phoneInfo = await metaApi.getPhoneNumberInfo();

    return NextResponse.json({
      configured: true,
      phoneNumber: phoneInfo.display_phone_number || null,
      verifiedName: phoneInfo.verified_name || null,
      qualityRating: phoneInfo.quality_rating || null,
      messagingLimit: phoneInfo.messaging_limit_tier
        ? formatMessagingLimit(phoneInfo.messaging_limit_tier)
        : null,
      phoneNumberId: metaApi.getConfig().phoneNumberId,
      sessionId: sessionId,
      source: sessionId ? 'database' : 'env',
    });
  } catch (apiError: any) {
    // API is configured but call failed (e.g. invalid token)
    return NextResponse.json({
      configured: true,
      error: apiError.message || 'Failed to fetch phone number info from Meta API',
      phoneNumberId: metaApi.getConfig().phoneNumberId,
      sessionId: sessionId,
      source: sessionId ? 'database' : 'env',
    });
  }
});

function formatMessagingLimit(tier: string): string {
  const tierMap: Record<string, string> = {
    TIER_50: '50/day',
    TIER_250: '250/day',
    TIER_1K: '1K/day',
    TIER_10K: '10K/day',
    TIER_100K: '100K/day',
    TIER_UNLIMITED: 'Unlimited',
  };
  return tierMap[tier] || tier;
}
