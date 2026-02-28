import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { 
      phone_number, 
      type, 
      content_type = 'text',
      message,
      media_url,
      caption,
      latitude,
      longitude,
      location_name,
      quoted_message_id,
    } = body

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's tenant_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
    }

    // Get contact
    const { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone_number', phone_number)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found. Create contact first.' }, { status: 404 })
    }

    // Get or create conversation
    let { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('contact_id', contact.id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (!conversation) {
      // Auto-create conversation if it doesn't exist
      const { data: session } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('status', 'connected')
        .limit(1)
        .single()

      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          contact_id: contact.id,
          tenant_id: profile.tenant_id,
          whatsapp_session_id: session?.id || null,
          status: 'open',
          workflow_status: 'incoming',
          last_message_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (convError) throw convError
      conversation = newConversation
    }

    // Prepare message content based on type
    let messageContent = ''
    let messageTypeValue: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' = 'text'
    let mediaUrlValue = null
    let mediaTypeValue = null

    if (content_type === 'text') {
      messageContent = message
      messageTypeValue = 'text'
    } else if (content_type === 'location') {
      messageContent = `📍 ${location_name || 'Location'}\nLat: ${latitude}, Lng: ${longitude}`
      messageTypeValue = 'location'
      mediaUrlValue = `geo:${latitude},${longitude}`
    } else {
      // Media types
      messageContent = caption || `[${content_type}]`
      messageTypeValue = content_type as any
      mediaUrlValue = media_url
      mediaTypeValue = content_type
    }

    // Create message
    const messageData: any = {
      conversation_id: conversation.id,
      tenant_id: profile.tenant_id,
      content: messageContent,
      message_type: messageTypeValue,
      sender_type: type === 'outgoing' ? 'agent' : 'customer',
      sender_id: type === 'outgoing' ? user.id : null,
      is_from_me: type === 'outgoing',
      status: type === 'outgoing' ? 'sent' : 'delivered',
      media_url: mediaUrlValue,
      media_type: mediaTypeValue,
      quoted_message_id: quoted_message_id || null,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: newMessage, error: messageError } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single()

    if (messageError) throw messageError

    // Update conversation last_message_at and last_message
    await supabase
      .from('conversations')
      .update({ 
        last_message_at: new Date().toISOString(),
        last_message: messageContent.substring(0, 100), // Store first 100 chars
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversation.id)

    return NextResponse.json({ 
      success: true, 
      message: newMessage,
      conversation,
    })
  } catch (error: any) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    )
  }
}
