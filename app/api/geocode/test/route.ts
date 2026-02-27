import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'

export const GET = withAuth(async (req, ctx) => {
    // Test search with a simple query
    const testQuery = 'bandung'
    
    console.log('[Geocode Test] Testing with query:', testQuery)
    
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(testQuery)}&limit=5&addressdetails=1`
    
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'WhatsAppCRM/1.0',
        'Accept-Language': 'id,en',
      }
    })

    console.log('[Geocode Test] Response status:', response.status)
    
    const data = await response.json()
    console.log('[Geocode Test] Data:', data)
    
    return NextResponse.json({
      success: true,
      query: testQuery,
      status: response.status,
      resultsCount: Array.isArray(data) ? data.length : 0,
      results: data
    })
}, { permission: 'admin.access' })
