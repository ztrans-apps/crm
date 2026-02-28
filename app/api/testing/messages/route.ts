import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const phone_number = searchParams.get('phone_number')

    if (!phone_number) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 })
    }

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
      .select('id')
      .eq('phone_number', phone_number)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (!contact) {
      return NextResponse.json({ messages: [] })
    }

    // Get conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('contact_id', contact.id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (!conversation) {
      return NextResponse.json({ messages: [] })
    }

    // Get recent messages (last 10)
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, content, message_type, sender_type, created_at')
      .eq('conversation_id', conversation.id)
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error

    // Format messages for display
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      content: msg.content || `[${msg.message_type}]`,
      type: msg.message_type,
      sender_type: msg.sender_type,
    }))

    return NextResponse.json({ 
      success: true,
      messages: formattedMessages,
    })
  } catch (error: any) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}
