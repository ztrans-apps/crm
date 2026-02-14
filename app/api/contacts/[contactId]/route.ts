/**
 * API Route: Contact by ID
 * Single contact operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantIdFromHeaders } from '@core/tenant';
import { ContactService } from '@modules/crm/contacts';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/contacts/[contactId]
 * Get contact by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { contactId: string } }
) {
  try {
    const tenantId = requireTenantIdFromHeaders(request.headers);

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contactService = new ContactService(tenantId);
    const contact = await contactService.getById(params.contactId);

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: contact,
    });
  } catch (error: any) {
    console.error('Error fetching contact:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch contact' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/contacts/[contactId]
 * Update contact
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { contactId: string } }
) {
  try {
    const tenantId = requireTenantIdFromHeaders(request.headers);

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, avatar_url, tags, metadata } = body;

    const contactService = new ContactService(tenantId);
    const contact = await contactService.update(params.contactId, {
      name,
      email,
      avatar_url,
      tags,
      metadata,
    });

    return NextResponse.json({
      success: true,
      data: contact,
    });
  } catch (error: any) {
    console.error('Error updating contact:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update contact' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/contacts/[contactId]
 * Delete contact
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { contactId: string } }
) {
  try {
    const tenantId = requireTenantIdFromHeaders(request.headers);

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contactService = new ContactService(tenantId);
    await contactService.delete(params.contactId);

    return NextResponse.json({
      success: true,
      message: 'Contact deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting contact:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete contact' },
      { status: 500 }
    );
  }
}
