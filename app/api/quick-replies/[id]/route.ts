import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * PUT /api/quick-replies/[id]
 * Update a quick reply
 */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      .update({
        shortcut: formattedShortcut,
        title,
        content,
        category: category || null,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
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
  } catch (error) {
    console.error('Error in PUT /api/quick-replies/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/quick-replies/[id]
 * Delete a quick reply
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('quick_replies')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting quick reply:', error);
      return NextResponse.json(
        { error: 'Failed to delete quick reply' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/quick-replies/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
