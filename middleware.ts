// middleware.ts
// Root middleware for Next.js — Auth + RBAC enforcement

import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

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
  '/api/send-message': 'chat.send',
  '/api/send-media': 'chat.send',
  '/api/send-location': 'chat.send',

  // ==================== AGENT STATUS ====================
  '/api/agent-status': 'chat.view',

  // ==================== DEBUG / TEST (admin) ====================
  '/api/debug': 'admin.access',
  '/api/test-queue': 'admin.access',
  '/api/test-redis': 'admin.access',
}

/**
 * Routes that should SKIP permission checks entirely
 * (public APIs, webhooks from external services, cron jobs, health checks, etc.)
 */
const SKIP_PERMISSION_ROUTES = [
  '/api/health',
  '/api/cron',
  '/api/whatsapp/webhook',     // Incoming webhook from WhatsApp
  '/api/webhooks/emit',        // Internal webhook emission
  '/api/v1/messages',          // External API (uses API key auth, not session)
  '/api/chat/operations',      // Internal chat operations (already has own auth)
  '/api/chat/conversations',   // Internal chat data
  '/api/translate',            // Translation utility
  '/api/geocode',              // Geocoding utility
  '/api/docs',                 // API documentation
  '/api/tenant',               // Tenant info
  '/api/conversations',        // Auto-assign (internal)
  '/api/messages',             // Message metadata update (internal)
]

export async function middleware(request: NextRequest) {
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

  // 3. API Route RBAC enforcement
  const pathname = request.nextUrl.pathname

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
