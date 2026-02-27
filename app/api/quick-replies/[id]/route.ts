import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

/**
 * PUT /api/quick-replies/[id]
 * Update a quick reply
 */
export const PUT = withAuth(async (req, ctx, params) => {
  const { id } = await params;
  const body = await req.json();
  const { shortcut, title, content, category, is_active } = body;

  if (!shortcut || !title || !content) {
    return NextResponse.json(
      { error: 'Shortcut, title, and content are required' },
      { status: 400 }
    );
  }

  // Ensure shortcut starts with /
  const formattedShortcut = shortcut.startsWith('/') ? shortcut : `/${shortcut}`;

  const { data: quickReply, error } = await ctx.supabase
    .from('quick_replies')
    .update({
      shortcut: formattedShortcut,
      title,
      content,
      category: category || null,
      is_active: is_active !== undefined ? is_active : true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating quick reply:', error);
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Shortcut already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update quick reply' },
      { status: 500 }
    );
  }

  return NextResponse.json({ quickReply });
});

/**
 * DELETE /api/quick-replies/[id]
 * Delete a quick reply
 */
export const DELETE = withAuth(async (req, ctx, params) => {
  const { id } = await params;

  const { error } = await ctx.supabase
    .from('quick_replies')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting quick reply:', error);
    return NextResponse.json(
      { error: 'Failed to delete quick reply' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
});
