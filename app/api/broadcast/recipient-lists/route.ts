import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

export const GET = withAuth(async (req, ctx) => {
  const { data: lists, error } = await ctx.supabase
    .from('recipient_lists')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching lists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lists' },
      { status: 500 }
    );
  }

  return NextResponse.json({ lists: lists || [] });
});

export const POST = withAuth(async (req, ctx) => {
  const formData = await req.formData();
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const source = formData.get('source') as string;
  const contactIdsStr = formData.get('contact_ids') as string;
  const file = formData.get('file') as File;

  if (!name) {
    return NextResponse.json(
      { error: 'Name is required' },
      { status: 400 }
    );
  }

  // Map source to valid database values
  let dbSource = source;
  const hasVariables = source === 'import-variabel';
  if (hasVariables) {
    dbSource = 'import';
  }

  // Create recipient list
  const { data: list, error: listError } = await ctx.supabase
    .from('recipient_lists')
    .insert({
      tenant_id: ctx.tenantId,
      created_by: ctx.user.id,
      name,
      description: description || null,
      source: dbSource,
      filter_criteria: hasVariables ? { has_variables: true } : {},
    })
    .select()
    .single();

  if (listError) {
    console.error('Error creating list:', listError);
    return NextResponse.json(
      { error: 'Failed to create list' },
      { status: 500 }
    );
  }

  // Handle different sources
  if (source === 'crm' && contactIdsStr) {
    const contactIds = JSON.parse(contactIdsStr);
    
    // Get contacts
    const { data: contacts } = await ctx.supabase
      .from('contacts')
      .select('id, phone_number')
      .in('id', contactIds)
      .eq('tenant_id', ctx.tenantId);

    if (contacts && contacts.length > 0) {
      const listContacts = contacts.map(contact => ({
        list_id: list.id,
        contact_id: contact.id,
      }));

      await ctx.supabase
        .from('recipient_list_contacts')
        .insert(listContacts);
    }
  } else if ((source === 'import' || source === 'import-variabel') && file) {
    // Parse CSV file
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'File CSV kosong atau tidak valid' },
        { status: 400 }
      );
    }

    // Skip header
    const dataLines = lines.slice(1);
    const listContactsToCreate = [];

    for (const line of dataLines) {
      const columns = line.split(/[,;]/).map(col => col.trim().replace(/^"|"$/g, ''));
      
      if (columns.length < 2) continue;
      
      const name = columns[0];
      let phoneNumber = columns[1];
      
      phoneNumber = phoneNumber.replace(/\D/g, '');
      
      if (!phoneNumber.startsWith('62')) {
        if (phoneNumber.startsWith('0')) {
          phoneNumber = '62' + phoneNumber.substring(1);
        } else if (phoneNumber.startsWith('8')) {
          phoneNumber = '62' + phoneNumber;
        }
      }
      
      if (!phoneNumber || phoneNumber.length < 10) continue;

      const { data: existingContact } = await ctx.supabase
        .from('contacts')
        .select('id')
        .eq('phone_number', phoneNumber)
        .eq('tenant_id', ctx.tenantId)
        .maybeSingle();

      let contactId;
      
      if (existingContact) {
        contactId = existingContact.id;
      } else {
        const { data: newContact, error: contactError } = await ctx.supabase
          .from('contacts')
          .insert({
            tenant_id: ctx.tenantId,
            user_id: ctx.user.id,
            name: name || phoneNumber,
            phone_number: phoneNumber,
          })
          .select('id')
          .single();

        if (contactError) {
          console.error('Error creating contact:', contactError);
          continue;
        }
        
        contactId = newContact.id;
      }

      listContactsToCreate.push({
        list_id: list.id,
        contact_id: contactId,
      });
    }

    if (listContactsToCreate.length > 0) {
      const { error: insertError } = await ctx.supabase
        .from('recipient_list_contacts')
        .insert(listContactsToCreate);
      
      if (insertError) {
        console.error('Error inserting list contacts:', insertError);
      }
    }
  }

  return NextResponse.json({ list });
});
