import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentTenant } from '@/core/tenant';

/**
 * GET /api/crm/contacts
 * Get all contacts for current tenant
 */
export async function GET(req: NextRequest) {
  try {
    const tenant = await getCurrentTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get('search');

    let query = supabase
      .from('contacts')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false });

    // Add search filter if provided
    if (search) {
      query = query.or(`name.ilike.%${search}%,phone_number.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching contacts:', error);
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
    }

    return NextResponse.json({ contacts: data || [] });
  } catch (error) {
    console.error('Error in GET /api/crm/contacts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/crm/contacts
 * Create a new contact
 */
export async function POST(req: NextRequest) {
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

    // Check if contact with same phone already exists
    const { data: existing } = await supabase
      .from('contacts')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('phone_number', phone_number)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Contact with this phone number already exists' },
        { status: 409 }
      );
    }

    // Create contact
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        tenant_id: tenant.id,
        name: name || null,
        phone_number,
        email: email || null,
        notes: notes || null,
        tags: tags || [],
        avatar_url: avatar_url || null,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating contact:', error);
      return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
    }

    return NextResponse.json({ contact: data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/crm/contacts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
