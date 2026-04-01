// lib/supabase/middleware.ts
// Supabase middleware for auth

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes - redirect to login if not authenticated
  // Public routes that don't require authentication
  const publicRoutes = [
    '/login',
    '/',
    '/about',
    '/privacy-policy',
    '/terms-of-service',
  ]
  
  // Also allow public API routes (webhooks, health checks, etc.)
  const isPublicApiRoute = request.nextUrl.pathname.startsWith('/api/whatsapp/webhook') ||
                          request.nextUrl.pathname.startsWith('/api/health') ||
                          request.nextUrl.pathname.startsWith('/api/cron') ||
                          request.nextUrl.pathname.startsWith('/api/docs')
  
  const isPublicRoute = publicRoutes.includes(request.nextUrl.pathname) || isPublicApiRoute

  if (!isPublicRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect to dashboard if logged in and trying to access login
  if (request.nextUrl.pathname === '/login' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
