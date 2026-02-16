/**
 * API Key Authentication Middleware
 * Validates API keys and checks scopes
 */

import { NextRequest, NextResponse } from 'next/server'
import { apiKeyService } from '@/lib/services/api-key.service'

export interface ApiKeyContext {
  apiKey: any
  tenantId: string
}

/**
 * Middleware to validate API key
 */
export async function validateApiKey(
  request: NextRequest,
  requiredScope?: string
): Promise<{ valid: boolean; context?: ApiKeyContext; error?: string }> {
  try {
    // Get API key from header
    const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '')
    
    if (!apiKey) {
      return {
        valid: false,
        error: 'API key required. Provide via X-API-Key header or Authorization: Bearer <key>',
      }
    }
    
    // Validate key
    const keyData = await apiKeyService.validateKey(apiKey)
    
    if (!keyData) {
      return {
        valid: false,
        error: 'Invalid or expired API key',
      }
    }
    
    // Check scope if required
    if (requiredScope && !apiKeyService.hasScope(keyData, requiredScope)) {
      return {
        valid: false,
        error: `Insufficient permissions. Required scope: ${requiredScope}`,
      }
    }
    
    return {
      valid: true,
      context: {
        apiKey: keyData,
        tenantId: keyData.tenant_id,
      },
    }
  } catch (error) {
    console.error('[ApiKeyAuth] Error validating API key:', error)
    return {
      valid: false,
      error: 'Internal server error',
    }
  }
}

/**
 * Wrapper function for API routes with API key authentication
 */
export function withApiKey(
  handler: (request: NextRequest, context: ApiKeyContext, params?: any) => Promise<NextResponse>,
  requiredScope?: string
) {
  return async (request: NextRequest, { params }: { params?: any } = {}) => {
    const startTime = Date.now()
    
    // Validate API key
    const { valid, context, error } = await validateApiKey(request, requiredScope)
    
    if (!valid || !context) {
      return NextResponse.json(
        { error: error || 'Unauthorized' },
        { status: 401 }
      )
    }
    
    try {
      // Call handler
      const response = await handler(request, context, params)
      
      // Log usage
      const responseTimeMs = Date.now() - startTime
      const url = new URL(request.url)
      
      await apiKeyService.logUsage(
        context.apiKey.id,
        context.tenantId,
        url.pathname,
        request.method,
        response.status,
        responseTimeMs,
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        request.headers.get('user-agent') || undefined
      )
      
      return response
    } catch (error: any) {
      console.error('[ApiKeyAuth] Error in handler:', error)
      
      // Log failed request
      const responseTimeMs = Date.now() - startTime
      const url = new URL(request.url)
      
      await apiKeyService.logUsage(
        context.apiKey.id,
        context.tenantId,
        url.pathname,
        request.method,
        500,
        responseTimeMs
      )
      
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

