import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'
import { apiKeyService } from '@/lib/services/api-key.service'

/**
 * Get API key usage statistics
 * GET /api/api-keys/:keyId/usage?days=7
 */
export const GET = withAuth(async (req, ctx, params) => {
  const { keyId } = await params
  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') || '7')

  const stats = await apiKeyService.getUsageStats(keyId, days)

  return NextResponse.json({ stats })
}, { permission: 'settings.manage' })

