import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'

export const GET = withAuth(async (req, ctx) => {
  const searchParams = req.nextUrl.searchParams
  const query = searchParams.get('q')

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    )
  }

  console.log('[Geocode] Searching for:', query)

  // Call Nominatim API from server-side to avoid CORS issues
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
  console.log('[Geocode] Calling Nominatim:', nominatimUrl)

  const response = await fetch(nominatimUrl, {
    headers: {
      'User-Agent': 'WhatsAppCRM/1.0', // Required by Nominatim
      'Accept-Language': 'id,en', // Prefer Indonesian results
    }
  })

  if (!response.ok) {
    console.error('[Geocode] Nominatim API error:', response.status, response.statusText)
    throw new Error(`Nominatim API error: ${response.status}`)
  }

  const data = await response.json()
  console.log('[Geocode] Results:', data.length, 'locations found')

  return NextResponse.json(data)
})
