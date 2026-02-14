import { NextRequest, NextResponse } from 'next/server'
import { apiKeyService } from '@/lib/services/api-key.service'

/**
 * Revoke API key
 * POST /api/api-keys/:keyId/revoke
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    await apiKeyService.revokeKey(params.keyId)

    return NextResponse.json({ success: true, message: 'API key revoked' })
  } catch (error: any) {
    console.error('[API] Error revoking API key:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to revoke API key' },
      { status: 500 }
    )
  }
}

/**
 * Delete API key
 * DELETE /api/api-keys/:keyId
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    await apiKeyService.deleteKey(params.keyId)

    return NextResponse.json({ success: true, message: 'API key deleted' })
  } catch (error: any) {
    console.error('[API] Error deleting API key:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete API key' },
      { status: 500 }
    )
  }
}

