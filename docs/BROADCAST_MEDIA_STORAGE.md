# Broadcast Media Storage Setup

This document explains how the broadcast media storage is configured and used in the application.

## Overview

The application uses Supabase Storage to store media files (images, videos, documents) for broadcast templates and campaigns. All media files are stored in the `broadcast-media` bucket.

## Storage Bucket Configuration

### Bucket Details
- **Bucket Name**: `broadcast-media`
- **Public Access**: Yes (files are publicly readable)
- **File Size Limit**: 16MB
- **Allowed MIME Types**:
  - Images: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
  - Videos: `video/mp4`, `video/quicktime`, `video/x-msvideo`
  - Documents: `application/pdf`

### Storage Policies

The bucket has the following RLS policies:

1. **Upload Policy**: Authenticated users can upload files
2. **Update Policy**: Authenticated users can update files
3. **Delete Policy**: Authenticated users can delete files
4. **Read Policy**: Public read access (anyone can view files)

## Setup Instructions

### 1. Run the Migration

The storage bucket is automatically created when you run the migration:

```bash
# Apply the migration
npm run db:migrate

# Or manually run the SQL file
psql -h <your-supabase-host> -U postgres -d postgres -f supabase/migrations/20260222100000_create_broadcast_media_bucket.sql
```

### 2. Verify Bucket Creation

You can verify the bucket was created in the Supabase Dashboard:

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. You should see the `broadcast-media` bucket listed
4. Click on it to view the bucket settings and policies

### 3. Manual Setup (Alternative)

If you prefer to create the bucket manually through the Supabase Dashboard:

1. Go to **Storage** → **Create a new bucket**
2. Set the following:
   - **Name**: `broadcast-media`
   - **Public bucket**: ✓ Enabled
   - **File size limit**: 16 MB
   - **Allowed MIME types**: Add the types listed above
3. Click **Create bucket**
4. Go to **Policies** tab and add the policies from the migration file

## File Organization

Files are organized in the following structure:

```
broadcast-media/
└── templates/
    ├── {template_id}_{timestamp}.jpg
    ├── {template_id}_{timestamp}.mp4
    └── {template_id}_{timestamp}.pdf
```

### File Naming Convention

- Format: `{id}_{timestamp}.{extension}`
- Example: `123e4567-e89b-12d3-a456-426614174000_1708617600000.jpg`
- The timestamp ensures unique filenames even if the same file is uploaded multiple times

## Usage in Code

### Uploading Files

```typescript
const fileExt = file.name.split('.').pop();
const fileName = `${id}_${Date.now()}.${fileExt}`;
const filePath = `templates/${fileName}`;

const { data, error } = await supabase.storage
  .from('broadcast-media')
  .upload(filePath, file, {
    contentType: file.type,
    upsert: true,
  });
```

### Getting Public URL

```typescript
const { data: { publicUrl } } = supabase.storage
  .from('broadcast-media')
  .getPublicUrl(filePath);
```

### Deleting Files

```typescript
await supabase.storage
  .from('broadcast-media')
  .remove([`templates/${fileName}`]);
```

## API Routes Using Storage

### Template Creation (POST /api/broadcast/templates)

When creating a template with media:
1. Validates the file type and size
2. Generates a unique filename
3. Uploads to `broadcast-media/templates/`
4. Stores the public URL in the database

### Template Update (PUT /api/broadcast/templates/[id])

When updating a template with new media:
1. Retrieves the existing template
2. Deletes the old media file (if exists)
3. Uploads the new media file
4. Updates the database with the new URL

If no new file is uploaded, the existing URL is preserved.

## Troubleshooting

### Issue: Files not uploading

**Possible causes:**
1. Storage bucket not created
2. RLS policies not configured
3. File size exceeds limit (16MB)
4. MIME type not allowed

**Solution:**
1. Verify bucket exists in Supabase Dashboard
2. Check policies are enabled
3. Reduce file size or increase bucket limit
4. Ensure file type is in the allowed list

### Issue: Files not displaying in preview

**Possible causes:**
1. Public access not enabled
2. CORS configuration issue
3. Invalid file URL

**Solution:**
1. Ensure bucket is set to public
2. Check Supabase CORS settings
3. Verify the URL format is correct

### Issue: Old files not being deleted

**Possible causes:**
1. File path mismatch
2. Delete policy not configured
3. File doesn't exist

**Solution:**
1. Check the file path format matches
2. Verify delete policy is enabled
3. Handle errors gracefully in code

## Security Considerations

1. **File Size Limit**: Set to 16MB to prevent abuse
2. **MIME Type Validation**: Only specific file types are allowed
3. **Authentication Required**: Only authenticated users can upload/modify files
4. **Public Read Access**: Files are publicly readable (required for WhatsApp)

## Best Practices

1. **Always validate file types** on the client and server side
2. **Generate unique filenames** to avoid conflicts
3. **Delete old files** when updating to save storage space
4. **Handle upload errors gracefully** with fallback behavior
5. **Use placeholders** during development if storage is not configured

## Related Files

- Migration: `supabase/migrations/20260222100000_create_broadcast_media_bucket.sql`
- API Routes:
  - `app/api/broadcast/templates/route.ts` (POST)
  - `app/api/broadcast/templates/[id]/route.ts` (PUT)
- Components:
  - `modules/broadcast/components/CreateTemplateWizard.tsx`
  - `modules/broadcast/components/CreateCampaign.tsx`
