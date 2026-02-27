import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

/**
 * GET /api/chatbots
 * Permission: chatbot.manage (enforced by middleware)
 */
export const GET = withAuth(async (req, ctx) => {
  const { data: chatbots, error } = await ctx.supabase
    .from('chatbots')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .order('priority', { ascending: false });

  if (error) {
    console.error('Error fetching chatbots:', error);
    return NextResponse.json({ error: 'Failed to fetch chatbots' }, { status: 500 });
  }

  return NextResponse.json({ chatbots: chatbots || [] });
});

/**
 * POST /api/chatbots
 * Permission: chatbot.manage (enforced by middleware)
 */
export const POST = withAuth(async (req, ctx) => {
  const body = await req.json();
  const { name, description, trigger_type, trigger_config, priority, is_active } = body;

  if (!name || !trigger_type) {
    return NextResponse.json({ error: 'Name and trigger type are required' }, { status: 400 });
  }

  const { data: chatbot, error } = await ctx.supabase
    .from('chatbots')
    .insert({
      tenant_id: ctx.tenantId,
      created_by: ctx.user.id,
      name,
      description: description || null,
      trigger_type,
      trigger_config: trigger_config || {},
      priority: priority || 0,
      is_active: is_active !== undefined ? is_active : true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating chatbot:', error);
    return NextResponse.json({ error: 'Failed to create chatbot' }, { status: 500 });
  }

  return NextResponse.json({ chatbot });
});
