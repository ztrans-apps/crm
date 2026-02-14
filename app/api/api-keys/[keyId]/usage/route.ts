import { NextRequest, NextResponse } from 'next/server'
import { apiKeyService } from '@/lib/services/api-key.service'

/**
 * Get API key usage statistics
 * GET /api/api-keys/:keyId/usage?days=7
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')

    const stats = await apiKeyService.getUsageStats(params.keyId, days)

    return NextResponse.json({ stats })
  } catch (error: any) {
    console.error('[API] Error getting API key usage:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get API key usage' },
      { status: 500 }
    )
  }
}

