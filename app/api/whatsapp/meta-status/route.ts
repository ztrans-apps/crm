/**
 * WhatsApp Meta Cloud API Status
 * Returns current API configuration status and phone number info
 */

import { NextResponse } from 'next/server';
import { getMetaCloudAPI } from '@/lib/whatsapp/meta-api';

export async function GET() {
  try {
    const metaApi = getMetaCloudAPI();

    if (!metaApi.isConfigured()) {
      return NextResponse.json({
        configured: false,
        error: 'Meta Cloud API not configured. Set META_WHATSAPP_TOKEN and META_PHONE_NUMBER_ID.',
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
      });
    } catch (apiError: any) {
      // API is configured but call failed (e.g. invalid token)
      return NextResponse.json({
        configured: true,
        error: apiError.message || 'Failed to fetch phone number info from Meta API',
        phoneNumberId: metaApi.getConfig().phoneNumberId,
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { configured: false, error: error.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}

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
