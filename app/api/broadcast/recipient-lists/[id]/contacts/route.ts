import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

export const GET = withAuth(async (req, ctx, params) => {
  const { id } = await params;

  const { data: contacts, error } = await ctx.supabase
    .from('recipient_list_contacts')
    .select(`
      *,
      contact:contacts(id, name, phone_number)
    `)
    .eq('list_id', id)
    .order('added_at', { ascending: false });

  if (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }

  return NextResponse.json({ contacts: contacts || [] });
});

export const DELETE = withAuth(async (req, ctx, params) => {
  const { id } = await params;
  const body = await req.json();
  const { contact_ids } = body;

  if (!contact_ids || contact_ids.length === 0) {
    return NextResponse.json(
      { error: 'No contacts specified' },
      { status: 400 }
    );
  }

  const { error } = await ctx.supabase
    .from('recipient_list_contacts')
    .delete()
    .in('id', contact_ids);

  if (error) {
    console.error('Error deleting contacts:', error);
    return NextResponse.json(
      { error: 'Failed to delete contacts' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
});
