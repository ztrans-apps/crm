import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/chatbots
 * Get all chatbots for the current tenant
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { data: chatbots, error } = await supabase
      .from('chatbots')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('priority', { ascending: false });

    if (error) {
      console.error('Error fetching chatbots:', error);
      return NextResponse.json(
        { error: 'Failed to fetch chatbots' },
        { status: 500 }
      );
    }

    return NextResponse.json({ chatbots: chatbots || [] });
  } catch (error) {
    console.error('Error in GET /api/chatbots:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/chatbots
 * Create a new chatbot
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const body = await req.json();
    const { name, description, trigger_type, trigger_config, priority, is_active } = body;

    if (!name || !trigger_type) {
      return NextResponse.json(
        { error: 'Name and trigger type are required' },
        { status: 400 }
      );
    }

    const { data: chatbot, error } = await supabase
      .from('chatbots')
      .insert({
        tenant_id: profile.tenant_id,
        created_by: user.id,
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
      return NextResponse.json(
        { error: 'Failed to create chatbot' },
        { status: 500 }
      );
    }

    return NextResponse.json({ chatbot });
  } catch (error) {
    console.error('Error in POST /api/chatbots:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
