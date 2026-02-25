import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getMetaCloudAPIForSession } from '@/lib/whatsapp/meta-api'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, to, latitude, longitude, address, name, conversationId, userId } = body

    if (!to || !latitude || !longitude || !conversationId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: to, latitude, longitude, conversationId, userId' },
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
      status: 'sent' as const,
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
      // Send location via Meta Cloud API (supports multi-number)
      const metaApi = await getMetaCloudAPIForSession(sessionId, supabase)

      if (!metaApi.isConfigured()) {
        throw new Error('WhatsApp Cloud API not configured. Set WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID environment variables.')
      }

      const result = await metaApi.sendLocation(to, {
        latitude,
        longitude,
        name: name || undefined,
        address: address || undefined,
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to send location via WhatsApp Cloud API')
      }

      console.log('[Send Location API] Location sent successfully via Meta Cloud API')

      // Update message status
      await supabase
        .from('messages')
        .update({
          status: 'sent',
          whatsapp_message_id: result.messageId,
          sent_at: new Date().toISOString(),
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
        messageId: savedMessage.id,
        whatsappMessageId: result.messageId,
        message: 'Location sent via WhatsApp Cloud API'
      })
    } catch (sendError: any) {
      console.error('WhatsApp Cloud API error:', sendError)
      
      // Update message status to failed
      await supabase
        .from('messages')
        .update({ status: 'failed', metadata: { error: sendError.message } })
        .eq('id', savedMessage.id)
      
      throw sendError
    }
  } catch (error: any) {
    console.error('Error sending location:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send location' },
      { status: 500 }
    )
  }
}
