import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

export const DELETE = withAuth(async (req, ctx, params) => {
  const { id } = await params;

  const { error } = await ctx.supabase
    .from('recipient_lists')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting list:', error);
    return NextResponse.json(
      { error: 'Failed to delete list' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
});

export const PUT = withAuth(async (req, ctx, params) => {
  const { id } = await params;
  const body = await req.json();
  const { name, description } = body;

  if (!name) {
    return NextResponse.json(
      { error: 'Name is required' },
      { status: 400 }
    );
  }

  const { data: list, error } = await ctx.supabase
    .from('recipient_lists')
    .update({
      name,
      description: description || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating list:', error);
    return NextResponse.json(
      { error: 'Failed to update list' },
      { status: 500 }
    );
  }

  return NextResponse.json({ list });
});
