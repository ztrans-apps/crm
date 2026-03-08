-- Enable RLS on messages and conversations tables for Realtime security
-- This migration ensures that Supabase Realtime subscriptions respect RLS policies
-- **Requirement 9.7**: Real-time updates use Supabase Realtime with RLS enforcement

-- Enable Row Level Security on conversations table
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Enable Row Level Security on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view conversations from their tenant
-- This ensures that Realtime subscriptions only receive updates for conversations
-- that belong to the user's tenant
CREATE POLICY "Users can view conversations from their tenant"
  ON conversations FOR SELECT
  USING (
    whatsapp_session_id IN (
      SELECT id FROM whatsapp_sessions 
      WHERE tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- RLS Policy: Users can update conversations from their tenant
CREATE POLICY "Users can update conversations from their tenant"
  ON conversations FOR UPDATE
  USING (
    whatsapp_session_id IN (
      SELECT id FROM whatsapp_sessions 
      WHERE tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- RLS Policy: Users can insert conversations for their tenant
CREATE POLICY "Users can insert conversations for their tenant"
  ON conversations FOR INSERT
  WITH CHECK (
    whatsapp_session_id IN (
      SELECT id FROM whatsapp_sessions 
      WHERE tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- RLS Policy: Users can view messages from conversations in their tenant
-- This ensures that Realtime subscriptions only receive message updates
-- for conversations that belong to the user's tenant
CREATE POLICY "Users can view messages from their tenant"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT c.id FROM conversations c
      INNER JOIN whatsapp_sessions ws ON c.whatsapp_session_id = ws.id
      WHERE ws.tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- RLS Policy: Users can insert messages for conversations in their tenant
CREATE POLICY "Users can insert messages for their tenant"
  ON messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT c.id FROM conversations c
      INNER JOIN whatsapp_sessions ws ON c.whatsapp_session_id = ws.id
      WHERE ws.tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- RLS Policy: Users can update messages from conversations in their tenant
CREATE POLICY "Users can update messages from their tenant"
  ON messages FOR UPDATE
  USING (
    conversation_id IN (
      SELECT c.id FROM conversations c
      INNER JOIN whatsapp_sessions ws ON c.whatsapp_session_id = ws.id
      WHERE ws.tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Add comments for documentation
COMMENT ON POLICY "Users can view conversations from their tenant" ON conversations IS 
  'Ensures Realtime subscriptions only receive conversation updates for the user''s tenant';

COMMENT ON POLICY "Users can view messages from their tenant" ON messages IS 
  'Ensures Realtime subscriptions only receive message updates for conversations in the user''s tenant';

-- Create indexes to optimize RLS policy checks
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(whatsapp_session_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_tenant_id ON whatsapp_sessions(tenant_id);
