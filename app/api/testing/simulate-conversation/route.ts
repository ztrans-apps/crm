import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { phone_number, contact_name } = await request.json()

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

    // Step 1: Create or get contact
    let { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone_number', phone_number)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (!contact) {
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          phone_number,
          name: contact_name,
          tenant_id: profile.tenant_id,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (contactError) throw contactError
      contact = newContact
    }

    // Step 2: Create or get conversation
    let { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('contact_id', contact.id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (!conversation) {
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

    // Step 3: Create sample messages
    const messages = [
      { content: 'Hi, I need help with my order', sender_type: 'customer', delay: 0 },
      { content: 'Hello! I\'d be happy to help. What\'s your order number?', sender_type: 'agent', delay: 2000 },
      { content: 'It\'s #12345', sender_type: 'customer', delay: 3000 },
      { content: 'Let me check that for you...', sender_type: 'agent', delay: 5000 },
      { content: 'Your order is being processed and will be shipped tomorrow!', sender_type: 'agent', delay: 7000 },
    ]

    const createdMessages = []
    let currentTime = new Date()

    for (const msg of messages) {
      const messageData: any = {
        conversation_id: conversation.id,
        tenant_id: profile.tenant_id,
        content: msg.content,
        message_type: 'text',
        sender_type: msg.sender_type,
        sender_id: msg.sender_type === 'agent' ? user.id : null,
        is_from_me: msg.sender_type === 'agent',
        status: msg.sender_type === 'agent' ? 'sent' : 'delivered',
        metadata: {},
        created_at: new Date(currentTime.getTime() + msg.delay).toISOString(),
        updated_at: new Date(currentTime.getTime() + msg.delay).toISOString(),
      }

      const { data: newMessage, error: msgError } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single()

      if (msgError) throw msgError
      createdMessages.push(newMessage)
    }

    // Update conversation
    const lastMessageContent = createdMessages[createdMessages.length - 1]?.content || ''
    await supabase
      .from('conversations')
      .update({ 
        last_message_at: new Date().toISOString(),
        last_message: lastMessageContent.substring(0, 100), // Store first 100 chars
        updated_at: new Date().toISOString(),
        workflow_status: 'in_progress',
      })
      .eq('id', conversation.id)

    return NextResponse.json({ 
      success: true, 
      contact,
      conversation,
      messages: createdMessages,
      message: `Created ${createdMessages.length} messages successfully`
    })
  } catch (error: any) {
    console.error('Error simulating conversation:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to simulate conversation' },
      { status: 500 }
    )
  }
}
