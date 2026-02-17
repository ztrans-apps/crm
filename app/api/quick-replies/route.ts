import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/quick-replies
 * Get all quick replies for the current tenant
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

    const { data: quickReplies, error } = await supabase
      .from('quick_replies')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('usage_count', { ascending: false });

    if (error) {
      console.error('Error fetching quick replies:', error);
      return NextResponse.json(
        { error: 'Failed to fetch quick replies' },
        { status: 500 }
      );
    }

    return NextResponse.json({ quickReplies: quickReplies || [] });
  } catch (error) {
    console.error('Error in GET /api/quick-replies:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/quick-replies
 * Create a new quick reply
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
    const { shortcut, title, content, category, is_active } = body;

    if (!shortcut || !title || !content) {
      return NextResponse.json(
        { error: 'Shortcut, title, and content are required' },
        { status: 400 }
      );
    }

    // Ensure shortcut starts with /
    const formattedShortcut = shortcut.startsWith('/') ? shortcut : `/${shortcut}`;

    const { data: quickReply, error } = await supabase
      .from('quick_replies')
      .insert({
        tenant_id: profile.tenant_id,
        created_by: user.id,
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
  } catch (error) {
    console.error('Error in POST /api/quick-replies:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
