-- Verification Script for Database Indexes
-- Requirements: 12.1
-- Task: 23.1 Add database indexes
--
-- This script helps verify that the indexes from migration 20240120000000
-- have been successfully created and are being used by queries.

-- ============================================================================
-- 1. LIST ALL INDEXES
-- ============================================================================

-- List all indexes in the public schema
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;


-- ============================================================================
-- 2. CHECK SPECIFIC TABLE INDEXES
-- ============================================================================

-- Contacts table indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'contacts' AND schemaname = 'public'
ORDER BY indexname;

-- Messages table indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'messages' AND schemaname = 'public'
ORDER BY indexname;

-- Conversations table indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'conversations' AND schemaname = 'public'
ORDER BY indexname;

-- Broadcasts table indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'broadcasts' AND schemaname = 'public'
ORDER BY indexname;

-- Profiles table indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY indexname;


-- ============================================================================
-- 3. CHECK INDEX USAGE STATISTICS
-- ============================================================================

-- Show index usage statistics for all tables
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as times_used,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;


-- ============================================================================
-- 4. IDENTIFY UNUSED INDEXES
-- ============================================================================

-- Find indexes that have never been used
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;


-- ============================================================================
-- 5. TEST QUERY PERFORMANCE WITH EXPLAIN ANALYZE
-- ============================================================================

-- Test 1: Contact lookup by phone number (should use idx_contacts_tenant_phone)
EXPLAIN ANALYZE
SELECT * FROM contacts 
WHERE tenant_id = 'YOUR_TENANT_ID' AND phone_number = '+1234567890';

-- Test 2: Messages by conversation (should use idx_messages_tenant_conversation)
EXPLAIN ANALYZE
SELECT * FROM messages 
WHERE tenant_id = 'YOUR_TENANT_ID' AND conversation_id = 'YOUR_CONVERSATION_ID'
ORDER BY created_at ASC
LIMIT 50;

-- Test 3: Active conversations for agent (should use idx_conversations_tenant_assigned)
EXPLAIN ANALYZE
SELECT * FROM conversations 
WHERE tenant_id = 'YOUR_TENANT_ID' AND assigned_to = 'YOUR_USER_ID' AND status = 'active'
ORDER BY updated_at DESC
LIMIT 50;

-- Test 4: Unread messages (should use idx_messages_conversation_unread)
EXPLAIN ANALYZE
SELECT COUNT(*) FROM messages 
WHERE conversation_id = 'YOUR_CONVERSATION_ID' AND read_at IS NULL;

-- Test 5: Scheduled broadcasts (should use idx_broadcasts_scheduled)
EXPLAIN ANALYZE
SELECT * FROM broadcasts 
WHERE status = 'scheduled' AND scheduled_at <= NOW()
ORDER BY scheduled_at ASC;

-- Test 6: Contact search by tags (should use idx_contacts_tags)
EXPLAIN ANALYZE
SELECT * FROM contacts 
WHERE tenant_id = 'YOUR_TENANT_ID' AND tags && ARRAY['vip', 'customer']
ORDER BY created_at DESC;


-- ============================================================================
-- 6. CHECK INDEX HEALTH
-- ============================================================================

-- Check for index bloat (wasted space)
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  pg_size_pretty(pg_table_size(tablename::regclass)) as table_size,
  round(100.0 * pg_relation_size(indexrelid) / pg_table_size(tablename::regclass), 2) as index_ratio
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;


-- ============================================================================
-- 7. VERIFY SPECIFIC INDEXES EXIST
-- ============================================================================

-- Check if all expected indexes exist
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_contacts_tenant_id') 
    THEN '✓ idx_contacts_tenant_id exists'
    ELSE '✗ idx_contacts_tenant_id MISSING'
  END as contacts_tenant_id,
  
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_contacts_phone_number') 
    THEN '✓ idx_contacts_phone_number exists'
    ELSE '✗ idx_contacts_phone_number MISSING'
  END as contacts_phone,
  
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_contacts_tenant_phone') 
    THEN '✓ idx_contacts_tenant_phone exists'
    ELSE '✗ idx_contacts_tenant_phone MISSING'
  END as contacts_tenant_phone,
  
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_messages_tenant_conversation') 
    THEN '✓ idx_messages_tenant_conversation exists'
    ELSE '✗ idx_messages_tenant_conversation MISSING'
  END as messages_tenant_conversation,
  
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_conversations_tenant_status') 
    THEN '✓ idx_conversations_tenant_status exists'
    ELSE '✗ idx_conversations_tenant_status MISSING'
  END as conversations_tenant_status;


-- ============================================================================
-- 8. PERFORMANCE COMPARISON
-- ============================================================================

-- Before running this, note the execution time of queries
-- Then compare with the same queries after indexes are added

-- Example: Time a query before and after indexing
\timing on

-- Run your query here
SELECT * FROM contacts WHERE tenant_id = 'YOUR_TENANT_ID' LIMIT 100;

\timing off


-- ============================================================================
-- NOTES
-- ============================================================================
--
-- What to look for in EXPLAIN ANALYZE output:
-- 
-- GOOD SIGNS:
-- - "Index Scan using idx_..." - Index is being used
-- - "Index Only Scan" - Even better, all data from index
-- - Low "actual time" values
-- - Low "rows" values (few rows scanned)
--
-- BAD SIGNS:
-- - "Seq Scan" - Full table scan (no index used)
-- - High "actual time" values
-- - High "rows" values (many rows scanned)
-- - "Bitmap Heap Scan" - May indicate index not selective enough
--
-- If you see "Seq Scan" where you expect an index:
-- 1. Check if index exists
-- 2. Run ANALYZE on the table to update statistics
-- 3. Check if query matches index columns
-- 4. For small tables, Postgres may choose Seq Scan (it's faster)
--
-- ============================================================================
