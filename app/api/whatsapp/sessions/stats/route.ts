import { NextRequest, NextResponse } from 'next/server'

const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001'

/**
 * Get session statistics
 * GET /api/whatsapp/sessions/stats
 */
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(
      `${WHATSAPP_SERVICE_URL}/api/sessions/stats/all`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to get statistics' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[API] Error getting statistics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

