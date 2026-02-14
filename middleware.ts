// middleware.ts
// Root middleware for Next.js

import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // 1. Update Supabase session
  const response = await updateSession(request)
  
  // 2. Add tenant context to request
  // For now, use default tenant. In production, extract from subdomain/header
  const tenantId = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'
  
  // Clone response and add tenant header
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
  
  return modifiedResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
