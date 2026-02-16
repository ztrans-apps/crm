/**
 * Session States Proxy API
 * Proxies requests to WhatsApp service for session states
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const whatsappServiceUrl = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';
    
    // Fetch from WhatsApp service
    const response = await fetch(`${whatsappServiceUrl}/api/sessions/states`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Don't cache, we want real-time data
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`WhatsApp service returned ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Session States] Error fetching from WhatsApp service:', error);
    
    // Return empty states instead of error to allow graceful fallback
    return NextResponse.json({
      success: false,
      error: error.message,
      states: [],
      timestamp: new Date().toISOString(),
      sessionCount: 0,
    });
  }
}
