import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

/**
 * GET /api/quick-replies
 * Get all quick replies for the current tenant
 */
export const GET = withAuth(async (req, ctx) => {
  const { data: quickReplies, error } = await ctx.supabase
    .from('quick_replies')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .order('usage_count', { ascending: false });

  if (error) {
    console.error('Error fetching quick replies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quick replies' },
      { status: 500 }
    );
  }

  return NextResponse.json({ quickReplies: quickReplies || [] });
});

/**
 * POST /api/quick-replies
 * Create a new quick reply
 */
export const POST = withAuth(async (req, ctx) => {
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
    .insert({
      tenant_id: ctx.tenantId,
      created_by: ctx.user.id,
      shortcut: formattedShortcut,
      title,
      content,
      category: category || null,
      is_active: is_active !== undefined ? is_active : true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating quick reply:', error);
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Shortcut already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create quick reply' },
      { status: 500 }
    );
  }

  return NextResponse.json({ quickReply });
});
