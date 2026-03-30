-- Fix RLS Policies for Webhook Access
-- This migration ensures webhook can write to tables while maintaining security

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Service role can insert contacts" ON contacts;
DROP POLICY IF EXISTS "Service role can update contacts" ON contacts;
DROP POLICY IF EXISTS "Service role can insert conversations" ON conversations;
DROP POLICY IF EXISTS "Service role can update conversations" ON conversations;
DROP POLICY IF EXISTS "Service role can insert messages" ON messages;
DROP POLICY IF EXISTS "Service role can update messages" ON messages;

-- Contacts: Allow service role to insert and update
CREATE POLICY "Service role can insert contacts"
ON contacts FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update contacts"
ON contacts FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can select contacts"
ON contacts FOR SELECT
TO service_role
USING (true);

-- Conversations: Allow service role to insert and update
CREATE POLICY "Service role can insert conversations"
ON conversations FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update conversations"
ON conversations FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can select conversations"
ON conversations FOR SELECT
TO service_role
USING (true);

-- Messages: Allow service role to insert and update
CREATE POLICY "Service role can insert messages"
ON messages FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update messages"
ON messages FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can select messages"
ON messages FOR SELECT
TO service_role
USING (true);

-- Also ensure authenticated users can access their tenant's data
-- (These might already exist, but we'll create them if not)

-- Contacts: Authenticated users can view/manage contacts in their tenant
CREATE POLICY IF NOT EXISTS "Users can view contacts in their tenant"
ON contacts FOR SELECT
TO authenticated
USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Users can insert contacts in their tenant"
ON contacts FOR INSERT
TO authenticated
WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Users can update contacts in their tenant"
ON contacts FOR UPDATE
TO authenticated
USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Conversations: Authenticated users can view/manage conversations in their tenant
CREATE POLICY IF NOT EXISTS "Users can view conversations in their tenant"
ON conversations FOR SELECT
TO authenticated
USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Users can insert conversations in their tenant"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Users can update conversations in their tenant"
ON conversations FOR UPDATE
TO authenticated
USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Messages: Authenticated users can view/manage messages in their tenant
CREATE POLICY IF NOT EXISTS "Users can view messages in their tenant"
ON messages FOR SELECT
TO authenticated
USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Users can insert messages in their tenant"
ON messages FOR INSERT
TO authenticated
WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Users can update messages in their tenant"
ON messages FOR UPDATE
TO authenticated
USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
