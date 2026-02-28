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

    // Get or create contact
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

    // Check if conversation already exists
    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('contact_id', contact.id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (existingConversation) {
      return NextResponse.json({ 
        success: true, 
        conversation: existingConversation,
        message: 'Conversation already exists'
      })
    }

    // Get first WhatsApp session (for testing)
    const { data: session } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .eq('status', 'connected')
      .limit(1)
      .single()

    // Create new conversation
    const { data: conversation, error } = await supabase
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

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      conversation,
      contact,
      message: 'Conversation created successfully'
    })
  } catch (error: any) {
    console.error('Error creating conversation:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create conversation' },
      { status: 500 }
    )
  }
}
