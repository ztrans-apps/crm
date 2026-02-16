import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Call WhatsApp service to get reconnect status
    const whatsappServiceUrl = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';
    
    const response = await fetch(
      `${whatsappServiceUrl}/api/whatsapp/reconnect-status/${sessionId}`
    );

    if (!response.ok) {
      throw new Error(`WhatsApp service error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error getting reconnect status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get reconnect status' },
      { status: 500 }
    );
  }
}
