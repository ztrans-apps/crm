import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentTenant } from '@/core/tenant';

/**
 * GET /api/crm/contacts/[contactId]
 * Get a specific contact
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { contactId: string } }
) {
  try {
    const tenant = await getCurrentTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', params.contactId)
      .eq('tenant_id', tenant.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({ contact: data });
  } catch (error) {
    console.error('Error in GET /api/crm/contacts/[contactId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/crm/contacts/[contactId]
 * Update a contact
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { contactId: string } }
) {
  try {
    const tenant = await getCurrentTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone_number, email, notes, tags, avatar_url, metadata } = body;

    // Validation
    if (!phone_number) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if contact exists and belongs to tenant
    const { data: existing } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', params.contactId)
      .eq('tenant_id', tenant.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Update contact
    const { data, error } = await supabase
      .from('contacts')
      .update({
        name: name || null,
        phone_number,
        email: email || null,
        notes: notes || null,
        tags: tags || [],
        avatar_url: avatar_url || null,
        metadata: metadata || {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.contactId)
      .eq('tenant_id', tenant.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating contact:', error);
      return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
    }

    return NextResponse.json({ contact: data });
  } catch (error) {
    console.error('Error in PUT /api/crm/contacts/[contactId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/crm/contacts/[contactId]
 * Delete a contact
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { contactId: string } }
) {
  try {
    const tenant = await getCurrentTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Check if contact exists and belongs to tenant
    const { data: existing } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', params.contactId)
      .eq('tenant_id', tenant.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Delete contact
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', params.contactId)
      .eq('tenant_id', tenant.id);

    if (error) {
      console.error('Error deleting contact:', error);
      return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/crm/contacts/[contactId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
