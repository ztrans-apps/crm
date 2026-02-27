import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'

export const GET = withAuth(async (req, ctx) => {
  const searchParams = req.nextUrl.searchParams
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  if (!lat || !lon) {
    return NextResponse.json(
      { error: 'Latitude and longitude parameters are required' },
      { status: 400 }
    )
  }

  // Call Nominatim reverse geocoding API from server-side
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
    {
      headers: {
        'User-Agent': 'WhatsAppCRM/1.0 (Contact: your-email@example.com)', // Required by Nominatim
        'Accept-Language': 'id,en', // Prefer Indonesian results
      }
    }
  )

  if (!response.ok) {
    throw new Error(`Nominatim API error: ${response.status}`)
  }

  const data = await response.json()

  return NextResponse.json(data)
})
