import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const whatsappServiceUrl = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001'

    console.log('[WhatsApp Clean Reconnect] Starting clean reconnect for session:', sessionId)

    // Call WhatsApp service clean-reconnect endpoint
    try {
      const response = await fetch(`${whatsappServiceUrl}/api/whatsapp/clean-reconnect/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to clean reconnect WhatsApp service')
      }

      const data = await response.json()
      console.log('[WhatsApp Clean Reconnect] Service response:', data)

      return NextResponse.json({
        success: true,
        message: 'Clean reconnection initiated - fresh QR code will be generated',
        sessionId
      })
    } catch (serviceError) {
      console.error('[WhatsApp Clean Reconnect] Service error:', serviceError)
      throw serviceError
    }
  } catch (error: any) {
    console.error('[WhatsApp Clean Reconnect] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to clean reconnect session'
      },
      { status: 500 }
    )
  }
}
