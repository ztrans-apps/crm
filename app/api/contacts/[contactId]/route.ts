import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

/**
 * GET /api/contacts/[contactId]
 * Permission: contact.view (enforced by middleware)
 */
export const GET = withAuth(async (req, ctx, params) => {
  const { contactId } = await params;

  const { data, error } = await ctx.supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .eq('tenant_id', ctx.tenantId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  return NextResponse.json({ contact: data });
});

/**
 * PUT /api/contacts/[contactId]
 * Permission: contact.edit
 */
export const PUT = withAuth(async (req, ctx, params) => {
  const { contactId } = await params;
  const body = await req.json();
  const { name, phone_number, email, notes, tags, avatar_url, metadata } = body;

  if (!phone_number) {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
  }

  const { data: existing } = await ctx.supabase
    .from('contacts')
    .select('id')
    .eq('id', contactId)
    .eq('tenant_id', ctx.tenantId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  const { data, error } = await ctx.supabase
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
    .eq('id', contactId)
    .eq('tenant_id', ctx.tenantId)
    .select()
    .single();

  if (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
  }

  return NextResponse.json({ contact: data });
}, { permission: 'contact.edit' });

/**
 * DELETE /api/contacts/[contactId]
 * Permission: contact.delete
 */
export const DELETE = withAuth(async (req, ctx, params) => {
  const { contactId } = await params;

  const { data: existing } = await ctx.supabase
    .from('contacts')
    .select('id')
    .eq('id', contactId)
    .eq('tenant_id', ctx.tenantId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  const { error } = await ctx.supabase
    .from('contacts')
    .delete()
    .eq('id', contactId)
    .eq('tenant_id', ctx.tenantId);

  if (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}, { permission: 'contact.delete' });
