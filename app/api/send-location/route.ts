import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { baileysAdapter } from '@/lib/queue/adapters/baileys-adapter'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, to, latitude, longitude, address, name, conversationId, userId } = body

    if (!sessionId || !to || !latitude || !longitude || !conversationId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create Supabase client with service role for server-side operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Store coordinates in content field (format: "lat,lng")
    const locationContent = `${latitude},${longitude}`
    
    // Store Google Maps URL in media_url
    const mediaUrl = `https://www.google.com/maps?q=${latitude},${longitude}`

    // Get default tenant ID
    const defaultTenantId = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'

    // Prepare message data
    const messageData = {
      conversation_id: conversationId,
      sender_type: 'agent' as const,
      sender_id: userId,
      content: locationContent,
      is_from_me: true,
      status: 'pending' as const, // Changed to pending since it's queued
      message_type: 'location' as const,
      media_url: mediaUrl,
      media_type: 'location' as const,
      media_filename: address || name || null,
      tenant_id: defaultTenantId,
      created_at: new Date().toISOString(),
    }

    // Save message to database first
    const { data: savedMessage, error: dbError } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to save message to database: ' + dbError.message },
        { status: 500 }
      )
    }

    try {
      // Send location via queue (instead of direct call)
      console.log('[Send Location API] Queueing location via Baileys adapter')
      const { jobId } = await baileysAdapter.sendLocation(
        sessionId,
        to,
        latitude,
        longitude,
        { address, name },
        defaultTenantId
      )

      console.log('[Send Location API] Location queued successfully, job ID:', jobId)

      // Update message status
      await supabase
        .from('messages')
        .update({
          status: 'sent',
          metadata: { queueJobId: jobId },
          updated_at: new Date().toISOString(),
        })
        .eq('id', savedMessage.id)

      // Update conversation last_message
      await supabase
        .from('conversations')
        .update({
          last_message: `📍 ${name || address || 'Location'}`,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)

      return NextResponse.json({
        success: true,
        jobId,
        messageId: savedMessage.id,
        message: 'Location queued for sending'
      })
    } catch (queueError: any) {
      console.error('Queue error:', queueError)
      
      // Update message status to failed
      await supabase
        .from('messages')
        .update({ status: 'failed', metadata: { error: queueError.message } })
        .eq('id', savedMessage.id)
      
      throw queueError
    }
  } catch (error: any) {
    console.error('Error sending location:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send location' },
      { status: 500 }
    )
  }
}
