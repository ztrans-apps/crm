import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';
import { ContactService } from '@/lib/services/contact-service';
import { UpdateContactSchema } from '@/lib/validation/schemas';
import { z } from 'zod';

// Schema for validating contactId parameter
const ContactIdParamSchema = z.object({
  contactId: z.string().uuid(),
});

/**
 * GET /api/contacts/[contactId]
 * 
 * Get a single contact by ID.
 * 
 * Requirements: 4.7, 9.1, 9.2
 * Permission: contact.view (enforced by middleware)
 */
export const GET = withAuth(async (req, ctx, params) => {
  try {
    const { contactId } = await params;

    // Initialize ContactService with authenticated context
    const contactService = new ContactService(ctx.serviceClient, ctx.tenantId);

    // Use service layer to fetch contact
    const contact = await contactService.getContact(contactId);

    return NextResponse.json({ contact });
  } catch (error: any) {
    console.error('Error fetching contact:', error);
    
    // Handle not found errors
    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Contact not found', message: error.message },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch contact', message: error.message },
      { status: 500 }
    );
  }
}, {
  permission: 'contact.view',
  rateLimit: {
    maxRequests: 200,
    windowSeconds: 60,
    keyPrefix: 'contacts:get',
  },
});

/**
 * PUT /api/contacts/[contactId]
 * 
 * Update an existing contact.
 * 
 * Requirements: 4.7, 9.1, 9.2
 * Permission: contact.edit
 */
export const PUT = withAuth(async (req, ctx, params) => {
  try {
    const { contactId } = await params;

    // Initialize ContactService with authenticated context
    const contactService = new ContactService(ctx.serviceClient, ctx.tenantId);

    // Use validated body from middleware
    const input = ctx.validatedBody;

    // Update contact using service layer
    const contact = await contactService.updateContact(contactId, input, ctx.user.id);

    return NextResponse.json({ contact });
  } catch (error: any) {
    console.error('Error updating contact:', error);
    
    // Handle not found errors
    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Contact not found', message: error.message },
        { status: 404 }
      );
    }
    
    // Handle business rule violations (duplicate email)
    if (error.message.includes('already exists')) {
      return NextResponse.json(
        { error: 'Conflict', message: error.message },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update contact', message: error.message },
      { status: 500 }
    );
  }
}, {
  permission: 'contact.edit',
  rateLimit: {
    maxRequests: 100,
    windowSeconds: 60,
    keyPrefix: 'contacts:update',
  },
  validation: {
    body: UpdateContactSchema,
  },
});

/**
 * DELETE /api/contacts/[contactId]
 * 
 * Delete a contact.
 * 
 * Requirements: 4.7, 9.1, 9.2
 * Permission: contact.delete
 */
export const DELETE = withAuth(async (req, ctx, params) => {
  try {
    const { contactId } = await params;

    // Initialize ContactService with authenticated context
    const contactService = new ContactService(ctx.serviceClient, ctx.tenantId);

    // Delete contact using service layer
    await contactService.deleteContact(contactId, ctx.user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting contact:', error);
    
    // Handle not found errors
    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Contact not found', message: error.message },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete contact', message: error.message },
      { status: 500 }
    );
  }
}, {
  permission: 'contact.delete',
  rateLimit: {
    maxRequests: 50,
    windowSeconds: 60,
    keyPrefix: 'contacts:delete',
  },
});
