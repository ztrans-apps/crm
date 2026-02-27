import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

/**
 * PATCH /api/chatbots/[id]
 * Update chatbot (partial update)
 */
export const PATCH = withAuth(async (req, ctx, params) => {
  const { id } = await params;
  const body = await req.json();

  const { data: chatbot, error } = await ctx.supabase
    .from('chatbots')
    .update({
      ...body,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating chatbot:', error);
    return NextResponse.json(
      { error: 'Failed to update chatbot' },
      { status: 500 }
    );
  }

  return NextResponse.json({ chatbot });
});

/**
 * DELETE /api/chatbots/[id]
 * Delete a chatbot
 */
export const DELETE = withAuth(async (req, ctx, params) => {
  const { id } = await params;

  const { error } = await ctx.supabase
    .from('chatbots')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting chatbot:', error);
    return NextResponse.json(
      { error: 'Failed to delete chatbot' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
});
