import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';

export const PUT = withAuth(async (req, ctx, params) => {
  const { id } = await params;

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
        // Get existing template to check if there's an old media file to delete
        const { data: existingTemplate } = await ctx.supabase
          .from('broadcast_templates')
          .select('header_media_url')
          .eq('id', id)
          .single();

        // Delete old file if exists
        if (existingTemplate?.header_media_url && existingTemplate.header_media_url.startsWith('http')) {
          const oldFilePath = existingTemplate.header_media_url.split('/').pop();
          if (oldFilePath && !oldFilePath.startsWith('placeholder_')) {
            await ctx.supabase.storage
              .from('broadcast-media')
              .remove([`templates/${oldFilePath}`]);
          }
        }

        // Upload new file
        const fileExt = headerMedia.name.split('.').pop();
        const fileName = `${id}_${Date.now()}.${fileExt}`;
        const filePath = `templates/${fileName}`;

        const { data: uploadData, error: uploadError } = await ctx.supabase.storage
          .from('broadcast-media')
          .upload(filePath, headerMedia, {
            contentType: headerMedia.type,
            upsert: true,
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
        // Continue with update even if upload fails
        headerMediaUrl = `placeholder_${headerMedia.name}`;
      }
    } else if (!headerMedia && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerFormat)) {
      // Keep existing media URL if no new file uploaded
      const { data: existingTemplate } = await ctx.supabase
        .from('broadcast_templates')
        .select('header_media_url')
        .eq('id', id)
        .single();
      
      headerMediaUrl = existingTemplate?.header_media_url || null;
    }

    const buttons = buttonsStr ? JSON.parse(buttonsStr) : [];
    const variables = variablesStr ? JSON.parse(variablesStr) : [];

    const { data: template, error } = await ctx.supabase
      .from('broadcast_templates')
      .update({
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
        // Keep content field for backward compatibility
        content: bodyText,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      return NextResponse.json(
        { error: 'Failed to update template' },
        { status: 500 }
      );
    }

    return NextResponse.json({ template });
    
  } else {
    // Old format (JSON) - for backward compatibility
    const body = await req.json();
    const { name, category, content } = body;

    const { data: template, error } = await ctx.supabase
      .from('broadcast_templates')
      .update({
        name,
        category: category || null,
        content,
        body_text: content, // Also update body_text
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      return NextResponse.json(
        { error: 'Failed to update template' },
        { status: 500 }
      );
    }

    return NextResponse.json({ template });
  }
});

export const DELETE = withAuth(async (req, ctx, params) => {
  const { id } = await params;

  const { error } = await ctx.supabase
    .from('broadcast_templates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
});
