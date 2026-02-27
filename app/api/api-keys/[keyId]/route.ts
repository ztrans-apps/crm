import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'
import { apiKeyService } from '@/lib/services/api-key.service'

/**
 * Revoke API key
 * POST /api/api-keys/:keyId/revoke
 */
export const POST = withAuth(async (req, ctx, params) => {
  const { keyId } = await params

  await apiKeyService.revokeKey(keyId)

  return NextResponse.json({ success: true, message: 'API key revoked' })
}, { permission: 'settings.manage' })

/**
 * Delete API key
 * DELETE /api/api-keys/:keyId
 */
export const DELETE = withAuth(async (req, ctx, params) => {
  const { keyId } = await params

  await apiKeyService.deleteKey(keyId)

  return NextResponse.json({ success: true, message: 'API key deleted' })
}, { permission: 'settings.manage' })

