// middleware.ts
// Root middleware for Next.js — Auth + RBAC enforcement + CORS

import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { RequestLogger } from '@/lib/middleware/request-logger'

/**
 * API Route → Required Permission mapping
 * Routes not listed here only need authentication (handled by supabase middleware)
 * Routes starting with the key path will require the specified permission
 */
const API_PERMISSIONS: Record<string, string | string[]> = {
  // ==================== CONTACTS ====================
  '/api/contacts': 'contact.view',

  // ==================== USERS ====================
  '/api/users': 'agent.view',

  // ==================== BROADCASTS ====================
  '/api/broadcasts': 'broadcast.manage',
  '/api/broadcast/campaigns': 'broadcast.manage',
  '/api/broadcast/recipient-lists': 'broadcast.manage',
  '/api/broadcast/templates': 'broadcast.manage',
  '/api/broadcast/stats': 'broadcast.view',
  '/api/broadcast/scheduler': 'broadcast.manage',
  '/api/broadcast/debug': 'admin.access',

  // ==================== CHATBOTS ====================
  '/api/chatbots': 'chatbot.manage',

  // ==================== WHATSAPP ====================
  '/api/whatsapp/sessions': 'whatsapp.session.view',
  '/api/whatsapp/init': 'whatsapp.session.create',
  '/api/whatsapp/delete': 'whatsapp.session.delete',
  '/api/whatsapp/disconnect': 'whatsapp.session.disconnect',
  '/api/whatsapp/cleanup': 'admin.access',
  '/api/whatsapp/session-states': 'whatsapp.session.view',
  '/api/whatsapp/session': 'whatsapp.session.view',
  '/api/whatsapp/rate-limit': 'whatsapp.session.view',
  '/api/whatsapp/meta-status': 'whatsapp.session.view',

  // ==================== DASHBOARD / ANALYTICS ====================
  '/api/dashboard': ['analytics.view', 'analytics.view.all', 'analytics.view.team', 'analytics.view.own'],

  // ==================== ADMIN ====================
  '/api/admin': 'admin.access',

  // ==================== RBAC MANAGEMENT ====================
  '/api/rbac/roles': 'role.view',
  '/api/rbac/permissions': 'role.view',
  '/api/rbac/users': 'agent.view',

  // ==================== SETTINGS ====================
  '/api/quick-replies': 'settings.manage',
  '/api/modules': 'settings.manage',

  // ==================== WEBHOOKS ====================
  '/api/webhooks': 'settings.manage',

  // ==================== API KEYS ====================
  '/api/api-keys': 'settings.manage',

  // ==================== BILLING ====================
  '/api/billing': 'settings.manage',

  // ==================== AUDIT ====================
  '/api/audit': 'admin.access',

  // ==================== QUEUE / METRICS (admin) ====================
  '/api/queue': 'admin.access',
  '/api/metrics': 'admin.access',

  // ==================== DELIVERY ====================
  '/api/delivery': ['analytics.view', 'analytics.view.all'],

  // ==================== SEND MESSAGE (chat) ====================
  '/api/send-message': 'chat.reply',
  '/api/send-media': 'chat.reply',
  '/api/send-location': 'chat.reply',

  // ==================== AGENT STATUS ====================
  '/api/agent-status': 'chat.view',

  // ==================== DEBUG / TEST (admin) ====================
  '/api/debug': 'admin.access',
  '/api/test-queue': 'admin.access',
  '/api/test-redis': 'admin.access',

  // ==================== WEBHOOKS EMIT (admin) ====================
  '/api/webhooks/emit': 'admin.access',

  // ==================== MESSAGE METADATA (admin) ====================
  '/api/messages': 'admin.access',

  // ==================== TENANT ====================
  // Note: /api/tenant/current is in SKIP list (any auth user needs it)
  // This only matches other /api/tenant/* write operations

  // ==================== UTILITIES (auth-only, no specific perm) ====================
  // translate + geocode are auth-only via withAuth, no middleware perm needed
}

/**
 * Routes that should SKIP permission checks entirely
 * (public APIs, webhooks from external services, cron jobs, health checks, etc.)
 */
const SKIP_PERMISSION_ROUTES = [
  '/api/health',
  '/api/cron',
  '/api/whatsapp/webhook',     // Incoming webhook from WhatsApp
  '/api/v1/messages',          // External API (uses API key auth, not session)
  '/api/chat/operations',      // Internal chat operations (has withAuth)
  '/api/chat/conversations',   // Internal chat data (has withAuth)
  '/api/docs',                 // API documentation
  '/api/conversations',        // Auto-assign (has withAuth)
  '/api/tenant/current',       // Tenant context (any authenticated user needs this)
  '/api/rbac/permissions',     // User's own permissions (needed for UI)
]

/**
 * Get allowed origins based on environment
 * In development: Allow localhost and development URLs
 * In production: Only allow whitelisted domains from environment variable
 */
function getAllowedOrigins(): string[] {
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  if (isDevelopment) {
    // Development: Allow localhost on common ports
    return [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    ]
  }
  
  // Production: Use environment variable for whitelisted origins
  const allowedOrigins = process.env.ALLOWED_ORIGINS || ''
  return allowedOrigins.split(',').map(origin => origin.trim()).filter(Boolean)
}

/**
 * Check if origin is allowed based on environment and whitelist
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false
  
  const allowedOrigins = getAllowedOrigins()
  return allowedOrigins.includes(origin)
}

/**
 * Add CORS headers to response
 */
function addCorsHeaders(response: NextResponse, origin: string | null, isPreflightRequest: boolean = false): NextResponse {
  // Only add CORS headers if origin is allowed
  if (origin && isOriginAllowed(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    
    if (isPreflightRequest) {
      // Preflight OPTIONS request
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Tenant-ID, X-API-Key')
      response.headers.set('Access-Control-Max-Age', '86400') // 24 hours
    }
  }
  
  return response
}

/**
 * Log CORS violation for security monitoring
 */
function logCorsViolation(request: NextRequest, origin: string | null, reason: string): void {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown'
  
  RequestLogger.logSecurityEvent({
    type: 'suspicious_activity',
    ip,
    details: {
      event: 'cors_violation',
      origin,
      reason,
      path: request.nextUrl.pathname,
      method: request.method,
      userAgent: request.headers.get('user-agent') || 'unknown',
    },
    timestamp: new Date().toISOString(),
  })
}

export async function middleware(request: NextRequest) {
  const origin = request.headers.get('origin')
  const pathname = request.nextUrl.pathname
  
  // Skip CORS checks for webhook endpoints (external services don't send Origin header)
  const isWebhook = pathname.startsWith('/api/whatsapp/webhook') || 
                    pathname.startsWith('/api/cron') ||
                    pathname.startsWith('/api/health')
  
  // Handle preflight OPTIONS requests for CORS
  if (request.method === 'OPTIONS' && !isWebhook) {
    // Check if origin is allowed
    if (origin && isOriginAllowed(origin)) {
      const response = new NextResponse(null, { status: 200 })
      return addCorsHeaders(response, origin, true)
    } else {
      // Log CORS violation for non-whitelisted origin
      if (origin) {
        logCorsViolation(request, origin, 'origin_not_whitelisted')
      }
      // Return 403 for disallowed origins
      return new NextResponse(null, { status: 403 })
    }
  }
  
  // 1. Update Supabase session (handles auth redirects)
  const response = await updateSession(request)
  
  // 2. Add tenant context to request
  const tenantId = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'
  
  const modifiedResponse = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  })
  
  modifiedResponse.headers.set('X-Tenant-ID', tenantId)
  
  // Copy cookies from original response
  response.cookies.getAll().forEach(cookie => {
    modifiedResponse.cookies.set(cookie)
  })

  // 3. Add CORS headers to response if origin is present (skip for webhooks)
  if (origin && !isWebhook) {
    if (isOriginAllowed(origin)) {
      addCorsHeaders(modifiedResponse, origin, false)
    } else {
      // Log CORS violation for non-whitelisted origin
      logCorsViolation(request, origin, 'origin_not_whitelisted')
    }
  }

  // 4. API Route RBAC enforcement
  if (pathname.startsWith('/api/')) {
    // Skip permission check for excluded routes
    const shouldSkip = SKIP_PERMISSION_ROUTES.some(route => pathname.startsWith(route))
    if (shouldSkip) {
      return modifiedResponse
    }

    // Find matching permission requirement
    const matchingRoute = Object.keys(API_PERMISSIONS)
      .sort((a, b) => b.length - a.length) // Longest match first
      .find(route => pathname.startsWith(route))

    if (matchingRoute) {
      const requiredPermission = API_PERMISSIONS[matchingRoute]
      
      // Add permission requirement as header (checked by withAuth or route handler)
      if (Array.isArray(requiredPermission)) {
        modifiedResponse.headers.set('X-Required-Permission', requiredPermission.join(','))
        modifiedResponse.headers.set('X-Permission-Mode', 'any')
      } else {
        modifiedResponse.headers.set('X-Required-Permission', requiredPermission)
        modifiedResponse.headers.set('X-Permission-Mode', 'single')
      }
    }
  }
  
  return modifiedResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
