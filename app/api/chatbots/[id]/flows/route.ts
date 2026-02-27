import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

/**
 * GET /api/chatbots/:id/flows
 * Permission: chatbot.manage (enforced by middleware)
 */
export const GET = withAuth(async (request, ctx, params) => {
  const { id } = await params;

  const { data: flows, error } = await ctx.supabase
    .from('chatbot_flows')
    .select('*')
    .eq('chatbot_id', id)
    .order('step_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ flows });
});

/**
 * POST /api/chatbots/:id/flows
 * Permission: chatbot.manage
 */
export const POST = withAuth(async (request, ctx, params) => {
  const { id } = await params;
  const body = await request.json();

  // Delete existing flows for this chatbot (simple approach)
  await ctx.supabase
    .from('chatbot_flows')
    .delete()
    .eq('chatbot_id', id);

  const { data: flow, error } = await ctx.supabase
    .from('chatbot_flows')
    .insert({
      chatbot_id: id,
      step_order: body.step_order || 1,
      step_type: body.step_type || 'message',
      content: body.content,
      options: body.options || [],
      conditions: body.conditions || {},
      actions: body.actions || {}
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ flow }, { status: 201 });
});
