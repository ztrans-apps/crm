-- ============================================================
-- DISABLE RLS - Semua security ditangani oleh RBAC application layer
-- 
-- Sistem ini menggunakan:
-- 1. RBAC lengkap (roles, permissions, user_roles, role_permissions)
-- 2. Server-side auth check (supabase.auth.getUser()) di setiap API route
-- 3. Permission middleware (lib/rbac/middleware.ts)
-- 4. Chat permissions (lib/rbac/chat-permissions.ts)
-- 5. Role hierarchy (Owner > Supervisor > Admin > Manager > Team Lead > Agent)
--
-- RLS tidak diperlukan karena semua akses data melewati Next.js API routes
-- yang sudah memverifikasi auth + permission sebelum query database.
--
-- Jalankan di Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ==================== CHAT / CONVERSATION ====================
ALTER TABLE IF EXISTS conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS conversation_labels DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS conversation_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS conversation_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS conversation_status_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS handover_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS labels DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contact_labels DISABLE ROW LEVEL SECURITY;

-- ==================== CONTACTS / CRM ====================
ALTER TABLE IF EXISTS contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;

-- ==================== WHATSAPP ====================
ALTER TABLE IF EXISTS whatsapp_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_whatsapp_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS whatsapp_messages DISABLE ROW LEVEL SECURITY;

-- ==================== BROADCAST ====================
ALTER TABLE IF EXISTS broadcast_campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS broadcast_recipients DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS broadcast_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS broadcast_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS broadcasts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recipient_lists DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recipient_list_contacts DISABLE ROW LEVEL SECURITY;

-- ==================== RBAC / AUTH ====================
ALTER TABLE IF EXISTS roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS role_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS resource_permissions DISABLE ROW LEVEL SECURITY;

-- ==================== CHATBOT ====================
ALTER TABLE IF EXISTS chatbots DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chatbot_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chatbot_flows DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chatbot_analytics DISABLE ROW LEVEL SECURITY;

-- ==================== SYSTEM / CONFIG ====================
ALTER TABLE IF EXISTS system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workspaces DISABLE ROW LEVEL SECURITY;

-- ==================== WEBHOOKS ====================
ALTER TABLE IF EXISTS webhooks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS webhook_logs DISABLE ROW LEVEL SECURITY;

-- ==================== API KEYS ====================
ALTER TABLE IF EXISTS api_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS api_key_usage DISABLE ROW LEVEL SECURITY;

-- ==================== BILLING ====================
ALTER TABLE IF EXISTS subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS usage_records DISABLE ROW LEVEL SECURITY;

-- ==================== ANALYTICS / DASHBOARD ====================
ALTER TABLE IF EXISTS analytics_snapshots DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agent_activity_logs DISABLE ROW LEVEL SECURITY;
-- agent_workflow_analytics is a VIEW, not a table — RLS does not apply

-- ==================== WORKFLOW / ROUTING ====================
ALTER TABLE IF EXISTS routing_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS permission_audit_log DISABLE ROW LEVEL SECURITY;

-- ==================== TICKETS ====================
ALTER TABLE IF EXISTS tickets DISABLE ROW LEVEL SECURITY;

-- ==================== QUICK REPLIES ====================
ALTER TABLE IF EXISTS quick_replies DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- VERIFIKASI: Cek tabel mana yang masih RLS enabled
-- ============================================================
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = true
ORDER BY tablename;
