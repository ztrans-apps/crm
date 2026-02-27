import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

export const GET = withAuth(async (req, ctx) => {
  const { data: templates, error } = await ctx.supabase
    .from('broadcast_templates')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }

  return NextResponse.json({ templates: templates || [] });
});

export const POST = withAuth(async (req, ctx) => {
  // Check if request is multipart/form-data (from wizard) or JSON (from old form)
  const contentType = req.headers.get('content-type') || '';
  
  if (contentType.includes('multipart/form-data')) {
    // New wizard format with file upload
    const formData = await req.formData();
    
    const name = formData.get('name') as string;
    const language = formData.get('language') as string;
    const category = formData.get('category') as string;
    const headerFormat = formData.get('headerFormat') as string;
    const headerText = formData.get('headerText') as string | null;
    const bodyText = formData.get('bodyText') as string;
    const footerText = formData.get('footerText') as string | null;
    const buttonType = formData.get('buttonType') as string;
    const buttonsStr = formData.get('buttons') as string;
    const variablesStr = formData.get('variables') as string;
    const headerMedia = formData.get('headerMedia') as File | null;

    if (!name || !bodyText || !category) {
      return NextResponse.json(
        { error: 'Name, body text, and category are required' },
        { status: 400 }
      );
    }

    let headerMediaUrl = null;
    
    // Handle file upload if present
    if (headerMedia && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerFormat)) {
      try {
        // Generate unique file name
        const fileExt = headerMedia.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `templates/${fileName}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await ctx.supabase.storage
          .from('broadcast-media')
          .upload(filePath, headerMedia, {
            contentType: headerMedia.type,
            upsert: false,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = ctx.supabase.storage
          .from('broadcast-media')
          .getPublicUrl(filePath);

        headerMediaUrl = publicUrl;
      } catch (uploadError) {
        console.error('Error uploading file:', uploadError);
        // Continue with placeholder if upload fails
        headerMediaUrl = `placeholder_${headerMedia.name}`;
      }
    }

    const buttons = buttonsStr ? JSON.parse(buttonsStr) : [];
    const variables = variablesStr ? JSON.parse(variablesStr) : [];

    const { data: template, error } = await ctx.supabase
      .from('broadcast_templates')
      .insert({
        tenant_id: ctx.tenantId,
        created_by: ctx.user.id,
        name,
        language,
        category,
        header_format: headerFormat,
        header_text: headerText,
        header_media_url: headerMediaUrl,
        body_text: bodyText,
        footer_text: footerText,
        button_type: buttonType,
        buttons,
        variables,
        status: 'DRAFT',
        // Keep content field for backward compatibility
        content: bodyText,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500 }
      );
    }

    return NextResponse.json({ template });
    
  } else {
    // Old format (JSON) - for backward compatibility
    const body = await req.json();
    const { name, category, content } = body;

    if (!name || !content) {
      return NextResponse.json(
        { error: 'Name and content are required' },
        { status: 400 }
      );
    }

    const { data: template, error } = await ctx.supabase
      .from('broadcast_templates')
      .insert({
        tenant_id: ctx.tenantId,
        created_by: ctx.user.id,
        name,
        category: category || null,
        content,
        body_text: content, // Also populate body_text
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500 }
      );
    }

    return NextResponse.json({ template });
  }
});
