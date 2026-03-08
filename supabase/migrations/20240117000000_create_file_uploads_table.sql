-- Create file_uploads table for tracking uploaded files
CREATE TABLE IF NOT EXISTS file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  storage_path TEXT NOT NULL,
  checksum TEXT NOT NULL,
  malware_scanned BOOLEAN NOT NULL DEFAULT false,
  malware_detected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_file_uploads_tenant_id ON file_uploads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_user_id ON file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_created_at ON file_uploads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_uploads_deleted_at ON file_uploads(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_file_uploads_checksum ON file_uploads(checksum);

-- Enable Row Level Security
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for file_uploads
CREATE POLICY "Users can view files from their tenant"
  ON file_uploads FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert files for their tenant"
  ON file_uploads FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update their own files"
  ON file_uploads FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can soft delete their own files"
  ON file_uploads FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
    AND user_id = auth.uid()
  )
  WITH CHECK (
    deleted_at IS NOT NULL
  );

-- Add comments for documentation
COMMENT ON TABLE file_uploads IS 'Tracks all uploaded files with security metadata';
COMMENT ON COLUMN file_uploads.filename IS 'Generated unique filename for storage';
COMMENT ON COLUMN file_uploads.original_filename IS 'Original filename from user upload';
COMMENT ON COLUMN file_uploads.mime_type IS 'MIME type of the file';
COMMENT ON COLUMN file_uploads.size_bytes IS 'File size in bytes';
COMMENT ON COLUMN file_uploads.storage_path IS 'Path to file in storage bucket';
COMMENT ON COLUMN file_uploads.checksum IS 'SHA-256 checksum for integrity verification';
COMMENT ON COLUMN file_uploads.malware_scanned IS 'Whether file has been scanned for malware';
COMMENT ON COLUMN file_uploads.malware_detected IS 'Whether malware was detected in file';
COMMENT ON COLUMN file_uploads.deleted_at IS 'Soft delete timestamp';
