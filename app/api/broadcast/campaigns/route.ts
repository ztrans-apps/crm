import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

/**
 * GET /api/broadcast/campaigns
 * Get all broadcast campaigns for the current tenant
 */
export const GET = withAuth(async (req, ctx) => {
  const { data: campaigns, error: campaignsError } = await ctx.supabase
    .from('broadcast_campaigns')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false });

  if (campaignsError) {
    console.error('Error fetching campaigns:', campaignsError);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }

  return NextResponse.json({ campaigns: campaigns || [] });
});

/**
 * POST /api/broadcast/campaigns
 * Create a new broadcast campaign
 */
export const POST = withAuth(async (req, ctx) => {
  const body = await req.json();
  const { name, message_template, scheduled_at, send_now, target_filter, recipient_list_id, whatsapp_account, sender_id, template_id } = body;

  // Validate required fields
  if (!name || !message_template) {
    return NextResponse.json(
      { error: 'Campaign name and message are required' },
      { status: 400 }
    );
  }

  // Get template data if template_id provided
  let templateData = null;
  if (template_id) {
    const { data: template } = await ctx.supabase
      .from('broadcast_templates')
      .select('*')
      .eq('id', template_id)
      .single();
    
    templateData = template;
  }

  // Get target contacts
  let contacts: any[] = [];
  
  if (recipient_list_id) {
    // Get contacts from recipient list
    const { data: listContacts, error: listError } = await ctx.supabase
      .from('recipient_list_contacts')
      .select('contact:contacts(id, phone_number)')
      .eq('list_id', recipient_list_id);
    
    if (listError) {
      console.error('Error fetching list contacts:', listError);
      return NextResponse.json(
        { error: 'Failed to fetch list contacts' },
        { status: 500 }
      );
    }
    
    contacts = listContacts?.map((lc: any) => lc.contact).filter(Boolean) || [];
  } else {
    // Get all contacts or filtered contacts
    let contactsQuery = ctx.supabase
      .from('contacts')
      .select('id, phone_number')
      .eq('tenant_id', ctx.tenantId);

    // Apply filters if provided
    if (target_filter?.tags && target_filter.tags.length > 0) {
      contactsQuery = contactsQuery.contains('tags', target_filter.tags);
    }

    const { data: allContacts, error: contactsError } = await contactsQuery;
    
    if (contactsError) {
      console.error('Error fetching contacts:', contactsError);
      return NextResponse.json(
        { error: 'Failed to fetch contacts' },
        { status: 500 }
      );
    }
    
    contacts = allContacts || [];
  }

  if (contacts.length === 0) {
    return NextResponse.json(
      { error: 'No contacts found matching the criteria' },
      { status: 400 }
    );
  }

  // Determine campaign status
  let status = 'draft';
  let scheduledAt = null;

  if (send_now) {
    status = 'sending';
  } else if (scheduled_at) {
    status = 'scheduled';
    scheduledAt = scheduled_at;
  }

  // Create campaign
  const { data: campaign, error: campaignError } = await ctx.supabase
    .from('broadcast_campaigns')
    .insert({
      tenant_id: ctx.tenantId,
      created_by: ctx.user.id,
      name,
      message_template,
      status,
      scheduled_at: scheduledAt,
      total_recipients: contacts.length,
      target_filter: target_filter || {},
      metadata: {
        whatsapp_account: whatsapp_account,
        sender_id: sender_id,
        template_id: template_id,
        template_data: templateData,
      },
    })
    .select()
    .single();

  if (campaignError) {
    console.error('Error creating campaign:', campaignError);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }

  // Create recipients
  const recipients = contacts.map(contact => ({
    campaign_id: campaign.id,
    contact_id: contact.id,
    phone_number: contact.phone_number,
    status: 'pending',
  }));

  const { error: recipientsError } = await ctx.supabase
    .from('broadcast_recipients')
    .insert(recipients);

  if (recipientsError) {
    console.error('Error creating recipients:', recipientsError);
    // Rollback campaign creation
    await ctx.supabase
      .from('broadcast_campaigns')
      .delete()
      .eq('id', campaign.id);
    
    return NextResponse.json(
      { error: 'Failed to create campaign recipients' },
      { status: 500 }
    );
  }

  // If send_now, mark as 'sending' so the cron processor picks it up immediately
  if (send_now) {
    await ctx.supabase
      .from('broadcast_campaigns')
      .update({ 
        status: 'sending',
        started_at: new Date().toISOString(),
      })
      .eq('id', campaign.id);
  }

  return NextResponse.json({ 
    campaign,
    message: send_now 
      ? 'Campaign created and queued for sending' 
      : scheduled_at 
      ? 'Campaign scheduled successfully' 
      : 'Campaign created as draft'
  });
}, { permission: 'broadcast.manage' });
