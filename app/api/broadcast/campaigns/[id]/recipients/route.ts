import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: recipients, error } = await supabase
      .from('broadcast_recipients')
      .select(`
        *,
        contact:contacts(name)
      `)
      .eq('campaign_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching recipients:', error);
      return NextResponse.json(
        { error: 'Failed to fetch recipients' },
        { status: 500 }
      );
    }

    return NextResponse.json({ recipients: recipients || [] });

  } catch (error) {
    console.error('Error in GET recipients:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
