-- Create security_events table for tracking security incidents
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('brute_force', 'credential_stuffing', 'suspicious_pattern', 'privilege_escalation', 'rate_limit', 'auth_failure', 'authz_failure')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  ip_address INET NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create blocked_entities table for tracking blocked IPs and users
CREATE TABLE IF NOT EXISTS blocked_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('ip', 'user', 'tenant')),
  entity_identifier TEXT NOT NULL,
  reason TEXT NOT NULL,
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_tenant_id ON security_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_security_events_ip_address ON security_events(ip_address);

CREATE INDEX IF NOT EXISTS idx_blocked_entities_entity_type ON blocked_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_blocked_entities_entity_identifier ON blocked_entities(entity_identifier);
CREATE INDEX IF NOT EXISTS idx_blocked_entities_expires_at ON blocked_entities(expires_at);
CREATE INDEX IF NOT EXISTS idx_blocked_entities_type_identifier ON blocked_entities(entity_type, entity_identifier);

-- Enable Row Level Security
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_entities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for security_events
CREATE POLICY "Users can view security events for their tenant"
  ON security_events FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can insert security events"
  ON security_events FOR INSERT
  WITH CHECK (true);

-- RLS Policies for blocked_entities
CREATE POLICY "Users can view blocked entities for their tenant"
  ON blocked_entities FOR SELECT
  USING (
    entity_type = 'tenant' AND entity_identifier IN (
      SELECT tenant_id::text FROM profiles WHERE id = auth.uid()
    )
    OR
    entity_type = 'user' AND entity_identifier IN (
      SELECT id::text FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "System can insert blocked entities"
  ON blocked_entities FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update blocked entities"
  ON blocked_entities FOR UPDATE
  USING (true);

-- Add comments for documentation
COMMENT ON TABLE security_events IS 'Tracks security-related events and threats';
COMMENT ON TABLE blocked_entities IS 'Tracks blocked IPs, users, and tenants';
COMMENT ON COLUMN security_events.event_type IS 'Type of security event detected';
COMMENT ON COLUMN security_events.severity IS 'Severity level of the security event';
COMMENT ON COLUMN security_events.details IS 'Additional context about the security event';
COMMENT ON COLUMN blocked_entities.entity_type IS 'Type of entity being blocked (ip, user, tenant)';
COMMENT ON COLUMN blocked_entities.entity_identifier IS 'Identifier of the blocked entity';
COMMENT ON COLUMN blocked_entities.expires_at IS 'When the block expires';
