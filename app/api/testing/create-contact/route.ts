import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { phone_number, name } = await request.json()

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

    // Check if contact already exists
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone_number', phone_number)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (existingContact) {
      return NextResponse.json({ 
        success: true, 
        contact: existingContact,
        message: 'Contact already exists'
      })
    }

    // Create new contact
    const { data: contact, error } = await supabase
      .from('contacts')
      .insert({
        phone_number,
        name,
        tenant_id: profile.tenant_id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      contact,
      message: 'Contact created successfully'
    })
  } catch (error: any) {
    console.error('Error creating contact:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create contact' },
      { status: 500 }
    )
  }
}
