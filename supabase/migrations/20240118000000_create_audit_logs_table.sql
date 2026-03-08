-- Create audit_logs table for compliance and security auditing
-- This table stores immutable audit records of all security-relevant actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  changes JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
-- Index on tenant_id for tenant-specific queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);

-- Index on user_id for user-specific audit trails
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- Index on action for filtering by action type
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Index on created_at for time-based queries (DESC for recent-first queries)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Composite index for common query patterns (tenant + time range)
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at DESC);

-- Composite index for user audit trails (user + time range)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view audit logs for their tenant
-- This ensures tenant isolation at the database level
CREATE POLICY "Users can view audit logs for their tenant"
  ON audit_logs FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policy: System can insert audit logs
-- Audit logs are append-only from the application perspective
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Prevent updates to audit logs (immutability)
-- Audit logs should never be modified after creation
CREATE POLICY "Prevent audit log updates"
  ON audit_logs FOR UPDATE
  USING (false);

-- RLS Policy: Prevent deletion of audit logs (immutability)
-- Audit logs should never be deleted (except via CASCADE from tenant deletion)
CREATE POLICY "Prevent audit log deletion"
  ON audit_logs FOR DELETE
  USING (false);

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Immutable audit trail of security-relevant actions for compliance';
COMMENT ON COLUMN audit_logs.id IS 'Unique identifier for the audit log entry';
COMMENT ON COLUMN audit_logs.tenant_id IS 'Tenant that owns this audit log entry';
COMMENT ON COLUMN audit_logs.user_id IS 'User who performed the action (NULL for system actions)';
COMMENT ON COLUMN audit_logs.action IS 'Action performed (e.g., login, logout, create_contact, update_message)';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource affected (e.g., contact, message, broadcast, api_key)';
COMMENT ON COLUMN audit_logs.resource_id IS 'ID of the specific resource affected';
COMMENT ON COLUMN audit_logs.changes IS 'JSONB object containing before/after values for data modifications';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of the client making the request';
COMMENT ON COLUMN audit_logs.user_agent IS 'User agent string of the client';
COMMENT ON COLUMN audit_logs.created_at IS 'Timestamp when the action occurred';

