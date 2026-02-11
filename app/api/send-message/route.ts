import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, to, message } = body

    if (!sessionId || !to || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, to, message' },
        { status: 400 }
      )
    }

    // Call WhatsApp service
    const whatsappServiceUrl = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001'
    
    const response = await fetch(`${whatsappServiceUrl}/api/whatsapp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        to,
        message,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('WhatsApp service error:', errorText)
      throw new Error(`WhatsApp service error: ${response.status} ${errorText}`)
    }

    const result = await response.json()

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    )
  }
}
