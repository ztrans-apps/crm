import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentTenant } from '@/core/tenant';

/**
 * GET /api/broadcast/campaigns
 * Get all campaigns for current tenant
 */
export async function GET(req: NextRequest) {
  try {
    const tenant = await getCurrentTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');

    let query = supabase
      .from('broadcast_campaigns')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false });

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching campaigns:', error);
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
    }

    return NextResponse.json({ campaigns: data || [] });
  } catch (error) {
    console.error('Error in GET /api/broadcast/campaigns:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/broadcast/campaigns
 * Create a new campaign
 */
export async function POST(req: NextRequest) {
  try {
    const tenant = await getCurrentTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      name, 
      message_template, 
      description,
      scheduled_at, 
      send_now, 
      target_contacts,
      target_type,
      target_labels,
      media_url,
      media_type,
      send_rate,
      metadata
    } = body;

    // Validation
    if (!name || !message_template) {
      return NextResponse.json(
        { error: 'Name and message template are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get recipients count
    let total_recipients = 0;
    if (target_contacts && target_contacts.length > 0) {
      total_recipients = target_contacts.length;
    } else {
      // If no specific recipients, count all contacts
      const { count } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id);
      total_recipients = count || 0;
    }

    // Determine status
    let status = 'draft';
    if (send_now) {
      status = 'sending';
    } else if (scheduled_at) {
      status = 'scheduled';
    }

    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();

    // Create campaign
    const { data, error } = await supabase
      .from('broadcast_campaigns')
      .insert({
        tenant_id: tenant.id,
        name,
        description: description || null,
        message_template,
        status,
        scheduled_at: scheduled_at || null,
        target_type: target_type || 'all',
        target_contacts: target_contacts || null,
        target_labels: target_labels || null,
        media_url: media_url || null,
        media_type: media_type || null,
        total_recipients,
        sent_count: 0,
        delivered_count: 0,
        read_count: 0,
        failed_count: 0,
        send_rate: send_rate || 10,
        retry_failed: true,
        metadata: metadata || {},
        created_by: user?.id || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating campaign:', error);
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
    }

    // If send_now, trigger sending (queue job)
    if (send_now) {
      // TODO: Queue broadcast job
      console.log('Queueing broadcast job for campaign:', data.id);
    }

    return NextResponse.json({ campaign: data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/broadcast/campaigns:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
