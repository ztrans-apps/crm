import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

/**
 * GET /api/contacts
 * Permission: contact.view (enforced by middleware)
 */
export const GET = withAuth(async (req, ctx) => {
  const searchParams = req.nextUrl.searchParams;
  const search = searchParams.get('search');

  let query = ctx.supabase
    .from('contacts')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone_number.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }

  return NextResponse.json({ contacts: data || [] });
});

/**
 * POST /api/contacts
 * Permission: contact.create
 */
export const POST = withAuth(async (req, ctx) => {
  const body = await req.json();
  const { name, phone_number, email, notes, tags, avatar_url, metadata } = body;

  if (!phone_number) {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
  }

  // Check if contact with same phone already exists
  const { data: existing } = await ctx.supabase
    .from('contacts')
    .select('id')
    .eq('tenant_id', ctx.tenantId)
    .eq('phone_number', phone_number)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Contact with this phone number already exists' }, { status: 409 });
  }

  const { data, error } = await ctx.supabase
    .from('contacts')
    .insert({
      tenant_id: ctx.tenantId,
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
}, { permission: 'contact.create' });
