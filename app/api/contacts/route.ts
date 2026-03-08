import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';
import { ContactService } from '@/lib/services/contact-service';
import { CreateContactSchema } from '@/lib/validation/schemas';
import { z } from 'zod';

/**
 * GET /api/contacts
 * 
 * List contacts with optional search filtering.
 * 
 * Query Parameters:
 * - search: Optional search query (searches name, phone, email)
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 50)
 * 
 * Requirements: 4.7, 9.1, 9.2
 * Permission: contact.view (enforced by middleware)
 */
export const GET = withAuth(async (req, ctx) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    // Initialize ContactService with authenticated context
    const contactService = new ContactService(ctx.serviceClient, ctx.tenantId);

    // Use service layer to fetch contacts
    const result = await contactService.listContacts({
      search,
      page,
      pageSize,
      sortBy: 'created_at',
      sortDirection: 'desc',
    });

    // Return paginated response (backward compatible)
    return NextResponse.json({
      contacts: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        hasMore: result.hasMore,
      },
    });
  } catch (error: any) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts', message: error.message },
      { status: 500 }
    );
  }
}, {
  permission: 'contact.view',
  rateLimit: {
    maxRequests: 100,
    windowSeconds: 60,
    keyPrefix: 'contacts:list',
  },
});

/**
 * POST /api/contacts
 * 
 * Create a new contact.
 * 
 * Requirements: 4.7, 9.1, 9.2
 * Permission: contact.create
 */
export const POST = withAuth(async (req, ctx) => {
  try {
    // Initialize ContactService with authenticated context
    const contactService = new ContactService(ctx.serviceClient, ctx.tenantId);

    // Use validated body from middleware
    const input = ctx.validatedBody;

    // Create contact using service layer
    const contact = await contactService.createContact(input, ctx.user.id);

    return NextResponse.json({ contact }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating contact:', error);
    
    // Handle business rule violations (duplicate phone/email)
    if (error.message.includes('already exists')) {
      return NextResponse.json(
        { error: 'Conflict', message: error.message },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create contact', message: error.message },
      { status: 500 }
    );
  }
}, {
  permission: 'contact.create',
  rateLimit: {
    maxRequests: 50,
    windowSeconds: 60,
    keyPrefix: 'contacts:create',
  },
  validation: {
    body: CreateContactSchema,
  },
});
