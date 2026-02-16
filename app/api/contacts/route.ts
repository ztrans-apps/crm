/**
 * API Route: Contacts
 * Contact management endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantIdFromHeaders } from '@core/tenant';
import { ContactService } from '@modules/crm/contacts';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/contacts
 * List all contacts for tenant
 */
export async function GET(request: NextRequest) {
  try {
    // Get tenant ID
    const tenantId = requireTenantIdFromHeaders(request.headers);

    // Check authentication
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const tags = searchParams.get('tags')?.split(',') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get contacts using service
    const contactService = new ContactService(tenantId);
    const contacts = await contactService.list({
      search,
      tags,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: contacts,
      meta: {
        limit,
        offset,
        count: contacts.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch contacts' 
      },
      { status: error.message === 'Tenant ID is required' ? 400 : 500 }
    );
  }
}

/**
 * POST /api/contacts
 * Create new contact
 */
export async function POST(request: NextRequest) {
  try {
    // Get tenant ID
    const tenantId = requireTenantIdFromHeaders(request.headers);

    // Check authentication
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { phone_number, name, email, avatar_url, tags, metadata } = body;

    if (!phone_number) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Create contact using service
    const contactService = new ContactService(tenantId);
    const contact = await contactService.create({
      phone_number,
      name,
      email,
      avatar_url,
      tags,
      metadata,
    });

    return NextResponse.json({
      success: true,
      data: contact,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating contact:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to create contact' 
      },
      { status: error.message === 'Tenant ID is required' ? 400 : 500 }
    );
  }
}
