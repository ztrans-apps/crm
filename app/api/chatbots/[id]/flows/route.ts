import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const { data: flows, error } = await supabase
      .from('chatbot_flows')
      .select('*')
      .eq('chatbot_id', id)
      .order('step_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ flows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Delete existing flows for this chatbot (simple approach)
    await supabase
      .from('chatbot_flows')
      .delete()
      .eq('chatbot_id', id);

    // Create new flow
    const { data: flow, error } = await supabase
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

    if (error) throw error;

    return NextResponse.json({ flow }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
