/**
 * Health Check Endpoint
 * Returns system health status
 */

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'whatsapp-crm',
  })
}
