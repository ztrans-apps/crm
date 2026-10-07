import { NextResponse } from 'next/server'
import { getWhatsAppServiceUrl } from '@/lib/whatsapp/service-url'

/**
 * Proxies Baileys /health through Next.js so the browser never calls
 * http://VPS:3001 directly (avoids Mixed Content on HTTPS frontends).
 */
export async function GET() {
  const serviceUrl = getWhatsAppServiceUrl().replace(/\/$/, '')

  try {
    const response = await fetch(`${serviceUrl}/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })

    const text = await response.text()
    let body: unknown = { ok: response.ok }
    try {
      body = JSON.parse(text)
    } catch {
      body = { ok: response.ok, raw: text.slice(0, 200) }
    }

    return NextResponse.json(body, { status: response.ok ? 200 : 502 })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'WhatsApp service unreachable',
      },
      { status: 502 }
    )
  }
}
