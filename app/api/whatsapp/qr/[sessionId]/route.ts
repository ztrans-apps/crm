import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    // Call WhatsApp service to get QR code
    const whatsappServiceUrl = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001'
    const response = await fetch(`${whatsappServiceUrl}/api/whatsapp/qr/${sessionId}`)

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to get QR code' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error getting QR code:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get QR code' },
      { status: 500 }
    )
  }
}
