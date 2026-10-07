import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWhatsAppServiceUrl } from '@/lib/whatsapp/service-url'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const whatsappServiceUrl = getWhatsAppServiceUrl()

    let response: Response
    try {
      response = await fetch(`${whatsappServiceUrl}/api/whatsapp/qr/${sessionId}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      })
    } catch (fetchError: any) {
      console.error('[WhatsApp QR] Service unreachable:', whatsappServiceUrl, fetchError?.message)
      return NextResponse.json(
        {
          error: 'WhatsApp service unreachable',
          message:
            'Baileys whatsapp-service is not running or WHATSAPP_SERVICE_URL is not set to your VPS URL. QR codes cannot be generated on Vercel alone.',
          serviceUrl: whatsappServiceUrl.replace(/\/\/.*@/, '//***@'),
        },
        { status: 503 }
      )
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      return NextResponse.json(
        {
          error: errorBody.error || 'Failed to get QR code',
          message: errorBody.message || 'WhatsApp service returned an error while fetching QR.',
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Sync connected status into Supabase (VPS often lacks SERVICE_KEY)
    if (data.status === 'connected') {
      try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('whatsapp_sessions')
            .update({
              status: 'connected',
              updated_at: new Date().toISOString(),
            })
            .eq('id', sessionId)
        }
      } catch (syncError) {
        console.error('[WhatsApp QR] Failed to sync connected status:', syncError)
      }
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('[WhatsApp QR] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get QR code' },
      { status: 500 }
    )
  }
}
