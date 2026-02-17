import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkCampaignCompletion } from '@/lib/queue/workers/broadcast-send.worker';

/**
 * POST /api/broadcast/campaigns/[id]/complete
 * Manually trigger campaign completion check
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Verify campaign belongs to user's tenant
    const { data: campaign } = await supabase
      .from('broadcast_campaigns')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Trigger completion check
    await checkCampaignCompletion(id);

    // Get updated campaign
    const { data: updatedCampaign } = await supabase
      .from('broadcast_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    return NextResponse.json({ 
      message: 'Campaign completion check triggered',
      campaign: updatedCampaign
    });

  } catch (error) {
    console.error('Error in POST /api/broadcast/campaigns/[id]/complete:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
