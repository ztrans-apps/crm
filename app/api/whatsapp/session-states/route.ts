/**
 * Session States Proxy API
 * Proxies requests to WhatsApp service for session states
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const whatsappServiceUrl = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';
    
    const response = await fetch(`${whatsappServiceUrl}/api/sessions/states`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`[Session States] WhatsApp service returned ${response.status}`);
      return NextResponse.json({
        success: false,
        error: `WhatsApp service error: ${response.status}`,
        states: [],
        timestamp: new Date().toISOString(),
        sessionCount: 0,
      }, { status: 200 }); // Return 200 to avoid breaking frontend
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error('[Session States] Error:', error.message);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      states: [],
      timestamp: new Date().toISOString(),
      sessionCount: 0,
    }, { status: 200 }); // Return 200 to avoid breaking frontend
  }
}
