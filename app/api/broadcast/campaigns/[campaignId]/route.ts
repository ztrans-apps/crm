import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentTenant } from '@/core/tenant';

/**
 * GET /api/broadcast/campaigns/[campaignId]
 * Get a specific campaign
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  try {
    const tenant = await getCurrentTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('broadcast_campaigns')
      .select('*')
      .eq('id', params.campaignId)
      .eq('tenant_id', tenant.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json({ campaign: data });
  } catch (error) {
    console.error('Error in GET /api/broadcast/campaigns/[campaignId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/broadcast/campaigns/[campaignId]
 * Update campaign status or details
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  try {
    const tenant = await getCurrentTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      status, 
      sent_count, 
      delivered_count, 
      read_count,
      failed_count,
      started_at,
      completed_at
    } = body;

    const supabase = await createClient();

    // Check if campaign exists and belongs to tenant
    const { data: existing } = await supabase
      .from('broadcast_campaigns')
      .select('id')
      .eq('id', params.campaignId)
      .eq('tenant_id', tenant.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Update campaign
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (status) updateData.status = status;
    if (sent_count !== undefined) updateData.sent_count = sent_count;
    if (delivered_count !== undefined) updateData.delivered_count = delivered_count;
    if (read_count !== undefined) updateData.read_count = read_count;
    if (failed_count !== undefined) updateData.failed_count = failed_count;
    if (started_at) updateData.started_at = started_at;
    if (completed_at) updateData.completed_at = completed_at;

    const { data, error } = await supabase
      .from('broadcast_campaigns')
      .update(updateData)
      .eq('id', params.campaignId)
      .eq('tenant_id', tenant.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating campaign:', error);
      return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
    }

    return NextResponse.json({ campaign: data });
  } catch (error) {
    console.error('Error in PATCH /api/broadcast/campaigns/[campaignId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/broadcast/campaigns/[campaignId]
 * Delete a campaign
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  try {
    const tenant = await getCurrentTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Check if campaign exists and belongs to tenant
    const { data: existing } = await supabase
      .from('broadcast_campaigns')
      .select('status')
      .eq('id', params.campaignId)
      .eq('tenant_id', tenant.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Don't allow deleting campaigns that are currently sending
    if (existing.status === 'sending') {
      return NextResponse.json(
        { error: 'Cannot delete campaign that is currently sending' },
        { status: 400 }
      );
    }

    // Delete campaign
    const { error } = await supabase
      .from('broadcast_campaigns')
      .delete()
      .eq('id', params.campaignId)
      .eq('tenant_id', tenant.id);

    if (error) {
      console.error('Error deleting campaign:', error);
      return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/broadcast/campaigns/[campaignId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
