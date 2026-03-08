-- Create consent tracking table for GDPR compliance
-- Requirements: 38.3, 38.4

CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  consent_type VARCHAR(100) NOT NULL, -- e.g., 'privacy_policy', 'terms_of_service', 'marketing', 'analytics', 'data_processing'
  purpose TEXT NOT NULL, -- Description of what the consent is for
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  version VARCHAR(50) NOT NULL, -- Version of the policy/terms
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX idx_user_consents_tenant_id ON user_consents(tenant_id);
CREATE INDEX idx_user_consents_consent_type ON user_consents(consent_type);
CREATE INDEX idx_user_consents_granted ON user_consents(granted);

-- Create composite index for common queries
CREATE INDEX idx_user_consents_user_tenant ON user_consents(user_id, tenant_id);

-- Add RLS policies
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own consents
CREATE POLICY "Users can view their own consents"
  ON user_consents
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own consents
CREATE POLICY "Users can insert their own consents"
  ON user_consents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own consents
CREATE POLICY "Users can update their own consents"
  ON user_consents
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_user_consents_updated_at
  BEFORE UPDATE ON user_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE user_consents IS 'Tracks user consent for GDPR compliance (Article 7)';
COMMENT ON COLUMN user_consents.consent_type IS 'Type of consent (privacy_policy, terms_of_service, marketing, analytics, data_processing)';
COMMENT ON COLUMN user_consents.purpose IS 'Description of what the consent is for';
COMMENT ON COLUMN user_consents.granted IS 'Whether consent is currently granted';
COMMENT ON COLUMN user_consents.granted_at IS 'When consent was granted';
COMMENT ON COLUMN user_consents.revoked_at IS 'When consent was revoked';
COMMENT ON COLUMN user_consents.version IS 'Version of the policy/terms that was consented to';
