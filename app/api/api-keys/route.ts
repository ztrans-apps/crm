import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'
import { apiKeyService } from '@/lib/services/api-key.service'

/**
 * List API keys
 * GET /api/api-keys
 */
export const GET = withAuth(async (req, ctx) => {
  const apiKeys = await apiKeyService.listKeys(ctx.tenantId)
  return NextResponse.json({ apiKeys })
})

/**
 * Create API key
 * POST /api/api-keys
 */
export const POST = withAuth(async (req, ctx) => {
  const body = await req.json()
  const { name, scopes, expiresInDays } = body

  // Validate
  if (!name || !scopes || !Array.isArray(scopes)) {
    return NextResponse.json(
      { error: 'Name and scopes are required' },
      { status: 400 }
    )
  }

  // Create API key
  const { apiKey, key } = await apiKeyService.createApiKey(
    ctx.tenantId,
    name,
    scopes,
    expiresInDays,
    ctx.user.id
  )

  return NextResponse.json(
    {
      apiKey,
      key, // Return the actual key only once
      warning: 'Save this key securely. It will not be shown again.',
    },
    { status: 201 }
  )
})

