-- Migration: Add database indexes for query optimization
-- Requirements: 12.1
-- Task: 23.1 Add database indexes
-- 
-- This migration adds indexes on frequently queried fields and composite indexes
-- for common query patterns to improve database query performance.

-- ============================================================================
-- CONTACTS TABLE INDEXES
-- ============================================================================

-- Index on tenant_id for tenant isolation queries
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id 
ON contacts(tenant_id);

-- Index on phone_number for contact lookup by phone
CREATE INDEX IF NOT EXISTS idx_contacts_phone_number 
ON contacts(phone_number);

-- Index on email for contact lookup by email
CREATE INDEX IF NOT EXISTS idx_contacts_email 
ON contacts(email) 
WHERE email IS NOT NULL;

-- Index on created_at for time-based queries and sorting
CREATE INDEX IF NOT EXISTS idx_contacts_created_at 
ON contacts(created_at DESC);

-- Composite index for tenant-scoped phone number lookups
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_phone 
ON contacts(tenant_id, phone_number);

-- Composite index for tenant-scoped email lookups
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_email 
ON contacts(tenant_id, email) 
WHERE email IS NOT NULL;

-- Index on tags for filtering contacts by tags (GIN index for array operations)
CREATE INDEX IF NOT EXISTS idx_contacts_tags 
ON contacts USING GIN(tags);


-- ============================================================================
-- MESSAGES TABLE INDEXES
-- ============================================================================

-- Index on tenant_id for tenant isolation queries
CREATE INDEX IF NOT EXISTS idx_messages_tenant_id 
ON messages(tenant_id);

-- Index on conversation_id for fetching messages by conversation
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
ON messages(conversation_id);

-- Index on created_at for time-based queries and chronological sorting
CREATE INDEX IF NOT EXISTS idx_messages_created_at 
ON messages(created_at DESC);

-- Index on status for filtering messages by delivery status
CREATE INDEX IF NOT EXISTS idx_messages_status 
ON messages(status);

-- Composite index for tenant-scoped conversation queries
CREATE INDEX IF NOT EXISTS idx_messages_tenant_conversation 
ON messages(tenant_id, conversation_id, created_at DESC);

-- Composite index for unread messages queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_unread 
ON messages(conversation_id, read_at) 
WHERE read_at IS NULL;

-- Composite index for status-based queries with tenant isolation
CREATE INDEX IF NOT EXISTS idx_messages_tenant_status 
ON messages(tenant_id, status, created_at DESC);


-- ============================================================================
-- CONVERSATIONS TABLE INDEXES
-- ============================================================================

-- Index on tenant_id for tenant isolation queries
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_id 
ON conversations(tenant_id);

-- Index on contact_id for finding conversations by contact
CREATE INDEX IF NOT EXISTS idx_conversations_contact_id 
ON conversations(contact_id);

-- Index on assigned_to for agent workload queries
CREATE INDEX IF NOT EXISTS idx_conversations_assigned_to 
ON conversations(assigned_to) 
WHERE assigned_to IS NOT NULL;

-- Index on status for filtering conversations by status
CREATE INDEX IF NOT EXISTS idx_conversations_status 
ON conversations(status);

-- Index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_conversations_created_at 
ON conversations(created_at DESC);

-- Index on updated_at for sorting by recent activity
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at 
ON conversations(updated_at DESC);

-- Composite index for tenant-scoped status queries
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_status 
ON conversations(tenant_id, status, updated_at DESC);

-- Composite index for agent assignment queries
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_assigned 
ON conversations(tenant_id, assigned_to, status) 
WHERE assigned_to IS NOT NULL;

-- Composite index for contact conversation history
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_contact 
ON conversations(tenant_id, contact_id, created_at DESC);


-- ============================================================================
-- BROADCASTS TABLE INDEXES
-- ============================================================================

-- Index on tenant_id for tenant isolation queries
CREATE INDEX IF NOT EXISTS idx_broadcasts_tenant_id 
ON broadcasts(tenant_id);

-- Index on status for filtering broadcasts by status
CREATE INDEX IF NOT EXISTS idx_broadcasts_status 
ON broadcasts(status);

-- Index on scheduled_at for finding scheduled broadcasts
CREATE INDEX IF NOT EXISTS idx_broadcasts_scheduled_at 
ON broadcasts(scheduled_at) 
WHERE scheduled_at IS NOT NULL;

-- Index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_broadcasts_created_at 
ON broadcasts(created_at DESC);

-- Composite index for tenant-scoped status queries
CREATE INDEX IF NOT EXISTS idx_broadcasts_tenant_status 
ON broadcasts(tenant_id, status, created_at DESC);

-- Composite index for scheduled broadcast queries
CREATE INDEX IF NOT EXISTS idx_broadcasts_scheduled 
ON broadcasts(status, scheduled_at) 
WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;


-- ============================================================================
-- PROFILES TABLE INDEXES
-- ============================================================================

-- Index on tenant_id for tenant isolation queries
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id 
ON profiles(tenant_id);

-- Index on user_id for user profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
ON profiles(user_id);

-- Index on email for email-based lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email 
ON profiles(email) 
WHERE email IS NOT NULL;

-- Index on role for role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_role 
ON profiles(role);

-- Index on agent_status for agent availability queries
CREATE INDEX IF NOT EXISTS idx_profiles_agent_status 
ON profiles(agent_status) 
WHERE agent_status IS NOT NULL;

-- Composite index for tenant-scoped user lookups
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_user 
ON profiles(tenant_id, user_id);

-- Composite index for agent availability queries
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_agent_status 
ON profiles(tenant_id, agent_status, active_chats_count) 
WHERE agent_status IS NOT NULL;


-- ============================================================================
-- AUDIT_LOGS TABLE INDEXES
-- ============================================================================

-- Note: audit_logs table already has these indexes created in 20240118000000_create_audit_logs_table.sql
-- Skipping duplicate index creation for audit_logs table

-- Note: audit_logs table already has indexes created in 20240118000000_create_audit_logs_table.sql
-- Skipping duplicate index creation for audit_logs table


-- ============================================================================
-- API_KEYS TABLE INDEXES
-- ============================================================================

-- Index on tenant_id for tenant isolation queries
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_id 
ON api_keys(tenant_id);

-- Index on key_prefix for API key validation
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix 
ON api_keys(key_prefix);

-- Index on expires_at for finding expired keys
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at 
ON api_keys(expires_at) 
WHERE expires_at IS NOT NULL;

-- Composite index for tenant-scoped key lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_prefix 
ON api_keys(tenant_id, key_prefix);


-- ============================================================================
-- SECURITY_EVENTS TABLE INDEXES
-- ============================================================================

-- Index on tenant_id for tenant isolation queries
CREATE INDEX IF NOT EXISTS idx_security_events_tenant_id 
ON security_events(tenant_id) 
WHERE tenant_id IS NOT NULL;

-- Index on event_type for filtering by event type
CREATE INDEX IF NOT EXISTS idx_security_events_type 
ON security_events(event_type);

-- Index on severity for filtering by severity level
CREATE INDEX IF NOT EXISTS idx_security_events_severity 
ON security_events(severity);

-- Index on ip_address for IP-based queries
CREATE INDEX IF NOT EXISTS idx_security_events_ip 
ON security_events(ip_address);

-- Index on timestamp for time-based queries
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp 
ON security_events(timestamp DESC);

-- Composite index for tenant-scoped security monitoring
CREATE INDEX IF NOT EXISTS idx_security_events_tenant_timestamp 
ON security_events(tenant_id, timestamp DESC) 
WHERE tenant_id IS NOT NULL;


-- ============================================================================
-- BLOCKED_ENTITIES TABLE INDEXES
-- ============================================================================

-- Index on entity_type for filtering by type
CREATE INDEX IF NOT EXISTS idx_blocked_entities_type 
ON blocked_entities(entity_type);

-- Index on identifier for entity lookup
CREATE INDEX IF NOT EXISTS idx_blocked_entities_identifier 
ON blocked_entities(identifier);

-- Index on expires_at for finding expired blocks
CREATE INDEX IF NOT EXISTS idx_blocked_entities_expires_at 
ON blocked_entities(expires_at) 
WHERE expires_at IS NOT NULL;

-- Composite index for entity blocking checks
CREATE INDEX IF NOT EXISTS idx_blocked_entities_type_identifier 
ON blocked_entities(entity_type, identifier, expires_at);


-- ============================================================================
-- FILE_UPLOADS TABLE INDEXES
-- ============================================================================

-- Index on tenant_id for tenant isolation queries
CREATE INDEX IF NOT EXISTS idx_file_uploads_tenant_id 
ON file_uploads(tenant_id);

-- Index on user_id for user file queries
CREATE INDEX IF NOT EXISTS idx_file_uploads_user_id 
ON file_uploads(user_id);

-- Index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_file_uploads_created_at 
ON file_uploads(created_at DESC);

-- Composite index for tenant-scoped file queries
CREATE INDEX IF NOT EXISTS idx_file_uploads_tenant_created 
ON file_uploads(tenant_id, created_at DESC);


-- ============================================================================
-- USER_CONSENTS TABLE INDEXES
-- ============================================================================

-- Index on user_id for user consent queries
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id 
ON user_consents(user_id);

-- Index on consent_type for filtering by consent type
CREATE INDEX IF NOT EXISTS idx_user_consents_type 
ON user_consents(consent_type);

-- Index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_user_consents_created_at 
ON user_consents(created_at DESC);

-- Composite index for user consent lookups
CREATE INDEX IF NOT EXISTS idx_user_consents_user_type 
ON user_consents(user_id, consent_type);


-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================
-- 
-- These indexes are designed to optimize the following common query patterns:
-- 
-- 1. Tenant isolation: All tables have tenant_id indexes for multi-tenant queries
-- 2. Time-based queries: created_at and updated_at indexes for sorting and filtering
-- 3. Lookup queries: phone_number, email, user_id for entity lookups
-- 4. Status filtering: status indexes on messages, conversations, broadcasts
-- 5. Relationship queries: Foreign key indexes (conversation_id, contact_id, etc.)
-- 6. Composite queries: Multi-column indexes for common query combinations
-- 
-- Index maintenance:
-- - PostgreSQL automatically maintains indexes on INSERT/UPDATE/DELETE
-- - Indexes are used automatically by the query planner when beneficial
-- - Monitor slow query logs to identify additional indexing opportunities
-- - Use EXPLAIN ANALYZE to verify index usage in production queries
