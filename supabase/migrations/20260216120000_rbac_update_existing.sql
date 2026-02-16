-- ============================================================================
-- RBAC System Update - Compatible with Existing Tables
-- ============================================================================
-- This migration updates existing RBAC tables and adds missing features

-- ============================================================================
-- 1. UPDATE ROLES TABLE
-- ============================================================================

-- Add missing columns to roles table
ALTER TABLE roles ADD COLUMN IF NOT EXISTS role_key VARCHAR(100);
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system_role BOOLEAN DEFAULT false;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE roles ADD COLUMN IF NOT EXISTS parent_role_id UUID REFERENCES roles(id) ON DELETE SET NULL;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS hierarchy_level INTEGER DEFAULT 0;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS template_category VARCHAR(50);

-- Update role_key for existing roles (if null)
UPDATE roles SET role_key = lower(replace(role_name, ' ', '_')) WHERE role_key IS NULL;

-- Make role_key NOT NULL after populating
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'roles' AND column_name = 'role_key' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE roles ALTER COLUMN role_key SET NOT NULL;
  END IF;
END $$;

-- Create unique constraint if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_role_key'
  ) THEN
    ALTER TABLE roles ADD CONSTRAINT unique_role_key UNIQUE (tenant_id, role_key);
  END IF;
END $$;

-- Create indexes if not exist
CREATE INDEX IF NOT EXISTS idx_roles_tenant ON roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_roles_key ON roles(role_key);
CREATE INDEX IF NOT EXISTS idx_roles_system ON roles(is_system_role) WHERE is_system_role = true;
CREATE INDEX IF NOT EXISTS idx_roles_parent ON roles(parent_role_id);
CREATE INDEX IF NOT EXISTS idx_roles_hierarchy ON roles(hierarchy_level);
CREATE INDEX IF NOT EXISTS idx_roles_template ON roles(is_template) WHERE is_template = true;

-- ============================================================================
-- 2. UPDATE PERMISSIONS TABLE
-- ============================================================================

-- Add missing columns to permissions table
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS resource VARCHAR(50);
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS is_system_permission BOOLEAN DEFAULT true;

-- Rename 'page' to 'resource' if needed (keep both for compatibility)
-- page column already exists, we'll use resource for new data

-- Create unique constraint if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'permissions_permission_key_key'
  ) THEN
    ALTER TABLE permissions ADD CONSTRAINT permissions_permission_key_key UNIQUE (permission_key);
  END IF;
END $$;

-- Create indexes if not exist
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_key ON permissions(permission_key);

-- ============================================================================
-- 3. UPDATE ROLE_PERMISSIONS TABLE
-- ============================================================================

-- Add missing columns
ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create unique constraint if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_role_permission'
  ) THEN
    ALTER TABLE role_permissions ADD CONSTRAINT unique_role_permission UNIQUE (role_id, permission_id);
  END IF;
END $$;

-- Create indexes if not exist
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- ============================================================================
-- 4. CREATE MISSING TABLES
-- ============================================================================

-- Create user_roles table if not exists
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Add expires_at column if table already exists but column doesn't
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_roles' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE user_roles ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add unique constraint if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_role'
  ) THEN
    ALTER TABLE user_roles ADD CONSTRAINT unique_user_role UNIQUE (user_id, role_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_expires ON user_roles(expires_at) WHERE expires_at IS NOT NULL;

-- Create resource_permissions table if not exists
CREATE TABLE IF NOT EXISTS resource_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_resource_permission UNIQUE (user_id, resource_type, resource_id, permission_key)
);

-- Add expires_at column if table already exists but column doesn't
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'resource_permissions' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE resource_permissions ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_resource_permissions_user ON resource_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_permissions_resource ON resource_permissions(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_permissions_expires ON resource_permissions(expires_at) WHERE expires_at IS NOT NULL;

-- Create permission_audit_log table if not exists
CREATE TABLE IF NOT EXISTS permission_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(50) NOT NULL,
  permission_key VARCHAR(100),
  resource_type VARCHAR(50),
  resource_id UUID,
  result BOOLEAN,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permission_audit_user ON permission_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_created ON permission_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_permission_audit_action ON permission_audit_log(action);

-- ============================================================================
-- 5. SEED SYSTEM PERMISSIONS (if not exist)
-- ============================================================================

-- Insert permissions only if they don't exist
INSERT INTO permissions (permission_key, permission_name, module, resource, action, description, is_system_permission) VALUES
-- Chat/Conversation Permissions
('chat.view.all', 'View All Conversations', 'chat', 'conversation', 'view', 'Can view all conversations regardless of assignment', true),
('chat.view.assigned', 'View Assigned Conversations', 'chat', 'conversation', 'view', 'Can view only assigned conversations', true),
('chat.view.team', 'View Team Conversations', 'chat', 'conversation', 'view', 'Can view team conversations', true),
('chat.reply', 'Reply to Conversations', 'chat', 'conversation', 'reply', 'Can send messages in conversations', true),
('chat.reply.closed', 'Reply to Closed Conversations', 'chat', 'conversation', 'reply', 'Can send messages to closed conversations', true),
('chat.reply.unassigned', 'Reply to Unassigned Conversations', 'chat', 'conversation', 'reply', 'Can send messages to unassigned conversations', true),
('chat.pick', 'Pick Conversations', 'chat', 'conversation', 'assign', 'Can pick/assign conversations to self', true),
('chat.assign', 'Assign Conversations', 'chat', 'conversation', 'assign', 'Can assign conversations to others', true),
('chat.handover', 'Handover Conversations', 'chat', 'conversation', 'assign', 'Can handover conversations to other agents', true),
('chat.close', 'Close Conversations', 'chat', 'conversation', 'close', 'Can close conversations', true),
('chat.reopen', 'Reopen Conversations', 'chat', 'conversation', 'reopen', 'Can reopen closed conversations', true),
('chat.delete', 'Delete Conversations', 'chat', 'conversation', 'delete', 'Can delete conversations', true),

-- Contact Permissions
('contact.view', 'View Contacts', 'contact', 'contact', 'view', 'Can view contact details', true),
('contact.create', 'Create Contacts', 'contact', 'contact', 'create', 'Can create new contacts', true),
('contact.edit', 'Edit Contacts', 'contact', 'contact', 'edit', 'Can edit contact information', true),
('contact.delete', 'Delete Contacts', 'contact', 'contact', 'delete', 'Can delete contacts', true),
('contact.import', 'Import Contacts', 'contact', 'contact', 'import', 'Can import contacts from file', true),
('contact.export', 'Export Contacts', 'contact', 'contact', 'export', 'Can export contacts to file', true),

-- Label Permissions
('label.view', 'View Labels', 'label', 'label', 'view', 'Can view labels', true),
('label.create', 'Create Labels', 'label', 'label', 'create', 'Can create new labels', true),
('label.edit', 'Edit Labels', 'label', 'label', 'edit', 'Can edit labels', true),
('label.delete', 'Delete Labels', 'label', 'label', 'delete', 'Can delete labels', true),
('label.apply', 'Apply Labels', 'label', 'label', 'apply', 'Can apply labels to conversations', true),
('label.remove', 'Remove Labels', 'label', 'label', 'remove', 'Can remove labels from conversations', true),

-- Note Permissions
('note.view', 'View Notes', 'note', 'note', 'view', 'Can view notes', true),
('note.create', 'Create Notes', 'note', 'note', 'create', 'Can create notes', true),
('note.edit.own', 'Edit Own Notes', 'note', 'note', 'edit', 'Can edit own notes', true),
('note.edit.all', 'Edit All Notes', 'note', 'note', 'edit', 'Can edit all notes', true),
('note.delete.own', 'Delete Own Notes', 'note', 'note', 'delete', 'Can delete own notes', true),
('note.delete.all', 'Delete All Notes', 'note', 'note', 'delete', 'Can delete all notes', true),

-- Broadcast Permissions
('broadcast.view', 'View Broadcasts', 'broadcast', 'campaign', 'view', 'Can view broadcast campaigns', true),
('broadcast.create', 'Create Broadcasts', 'broadcast', 'campaign', 'create', 'Can create broadcast campaigns', true),
('broadcast.edit', 'Edit Broadcasts', 'broadcast', 'campaign', 'edit', 'Can edit broadcast campaigns', true),
('broadcast.delete', 'Delete Broadcasts', 'broadcast', 'campaign', 'delete', 'Can delete broadcast campaigns', true),
('broadcast.send', 'Send Broadcasts', 'broadcast', 'campaign', 'send', 'Can send broadcast campaigns', true),
('broadcast.schedule', 'Schedule Broadcasts', 'broadcast', 'campaign', 'schedule', 'Can schedule broadcast campaigns', true),

-- Analytics Permissions
('analytics.view.own', 'View Own Analytics', 'analytics', 'report', 'view', 'Can view own analytics', true),
('analytics.view.team', 'View Team Analytics', 'analytics', 'report', 'view', 'Can view team analytics', true),
('analytics.view.all', 'View All Analytics', 'analytics', 'report', 'view', 'Can view all analytics', true),
('analytics.export', 'Export Analytics', 'analytics', 'report', 'export', 'Can export analytics reports', true),

-- Chatbot Permissions
('chatbot.view', 'View Chatbot Flows', 'chatbot', 'flow', 'view', 'Can view chatbot flows', true),
('chatbot.create', 'Create Chatbot Flows', 'chatbot', 'flow', 'create', 'Can create chatbot flows', true),
('chatbot.edit', 'Edit Chatbot Flows', 'chatbot', 'flow', 'edit', 'Can edit chatbot flows', true),
('chatbot.delete', 'Delete Chatbot Flows', 'chatbot', 'flow', 'delete', 'Can delete chatbot flows', true),
('chatbot.activate', 'Activate Chatbot', 'chatbot', 'flow', 'activate', 'Can activate/deactivate chatbot', true),

-- Role Management Permissions
('role.view', 'View Roles', 'rbac', 'role', 'view', 'Can view roles', true),
('role.create', 'Create Roles', 'rbac', 'role', 'create', 'Can create new roles', true),
('role.edit', 'Edit Roles', 'rbac', 'role', 'edit', 'Can edit roles', true),
('role.delete', 'Delete Roles', 'rbac', 'role', 'delete', 'Can delete roles', true),
('role.assign', 'Assign Roles', 'rbac', 'role', 'assign', 'Can assign roles to users', true),

-- User Management Permissions
('user.view', 'View Users', 'user', 'user', 'view', 'Can view users', true),
('user.create', 'Create Users', 'user', 'user', 'create', 'Can create new users', true),
('user.edit', 'Edit Users', 'user', 'user', 'edit', 'Can edit users', true),
('user.delete', 'Delete Users', 'user', 'user', 'delete', 'Can delete users', true),
('user.activate', 'Activate/Deactivate Users', 'user', 'user', 'activate', 'Can activate or deactivate users', true),

-- Settings Permissions
('settings.view', 'View Settings', 'settings', 'settings', 'view', 'Can view settings', true),
('settings.edit', 'Edit Settings', 'settings', 'settings', 'edit', 'Can edit settings', true),
('settings.whatsapp', 'Manage WhatsApp Settings', 'settings', 'whatsapp', 'manage', 'Can manage WhatsApp settings', true),
('settings.billing', 'Manage Billing', 'settings', 'billing', 'manage', 'Can manage billing settings', true)
ON CONFLICT (permission_key) DO NOTHING;

-- ============================================================================
-- 6. SEED SYSTEM ROLES (if not exist)
-- ============================================================================

-- Owner Role
INSERT INTO roles (role_key, role_name, description, is_system_role, is_master_template, hierarchy_level, tenant_id) VALUES
('owner', 'Owner', 'Full system access with all permissions', true, false, 100, NULL)
ON CONFLICT ON CONSTRAINT unique_role_key DO NOTHING;

-- Supervisor Role
INSERT INTO roles (role_key, role_name, description, is_system_role, is_master_template, hierarchy_level, tenant_id) VALUES
('supervisor', 'Supervisor', 'Team management and oversight', true, false, 50, NULL)
ON CONFLICT ON CONSTRAINT unique_role_key DO NOTHING;

-- Agent Role
INSERT INTO roles (role_key, role_name, description, is_system_role, is_master_template, hierarchy_level, tenant_id) VALUES
('agent', 'Agent', 'Customer service agent with limited access', true, false, 10, NULL)
ON CONFLICT ON CONSTRAINT unique_role_key DO NOTHING;

-- Set hierarchy relationships
UPDATE roles 
SET parent_role_id = (SELECT id FROM roles WHERE role_key = 'owner' AND is_system_role = true)
WHERE role_key = 'supervisor' AND is_system_role = true AND parent_role_id IS NULL;

UPDATE roles 
SET parent_role_id = (SELECT id FROM roles WHERE role_key = 'supervisor' AND is_system_role = true)
WHERE role_key = 'agent' AND is_system_role = true AND parent_role_id IS NULL;

-- ============================================================================
-- 7. ASSIGN PERMISSIONS TO ROLES (if not exist)
-- ============================================================================

-- Owner: ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE role_key = 'owner' AND is_system_role = true),
  id
FROM permissions
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id = (SELECT id FROM roles WHERE role_key = 'owner' AND is_system_role = true)
    AND rp.permission_id = permissions.id
);

-- Supervisor: Most permissions except user/role management
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE role_key = 'supervisor' AND is_system_role = true),
  id
FROM permissions
WHERE permission_key IN (
  'chat.view.all', 'chat.view.team', 'chat.reply', 'chat.pick', 'chat.assign', 
  'chat.handover', 'chat.close', 'chat.reopen',
  'contact.view', 'contact.create', 'contact.edit', 'contact.import', 'contact.export',
  'label.view', 'label.create', 'label.edit', 'label.apply', 'label.remove',
  'note.view', 'note.create', 'note.edit.own', 'note.edit.all', 'note.delete.own',
  'broadcast.view', 'broadcast.create', 'broadcast.edit', 'broadcast.send', 'broadcast.schedule',
  'analytics.view.team', 'analytics.view.all', 'analytics.export',
  'chatbot.view', 'chatbot.create', 'chatbot.edit', 'chatbot.activate',
  'settings.view', 'settings.whatsapp'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id = (SELECT id FROM roles WHERE role_key = 'supervisor' AND is_system_role = true)
    AND rp.permission_id = permissions.id
);

-- Agent: Limited permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE role_key = 'agent' AND is_system_role = true),
  id
FROM permissions
WHERE permission_key IN (
  'chat.view.assigned', 'chat.reply', 'chat.pick', 'chat.handover',
  'contact.view', 'contact.edit',
  'label.view', 'label.apply',
  'note.view', 'note.create', 'note.edit.own', 'note.delete.own',
  'analytics.view.own'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id = (SELECT id FROM roles WHERE role_key = 'agent' AND is_system_role = true)
    AND rp.permission_id = permissions.id
);

-- ============================================================================
-- 8. CREATE DATABASE FUNCTIONS (if not exist)
-- ============================================================================

-- Drop existing RLS policies that depend on functions
DROP POLICY IF EXISTS "Only users with role.create can insert roles" ON roles;
DROP POLICY IF EXISTS "Only users with role.edit can update roles" ON roles;
DROP POLICY IF EXISTS "Only users with role.delete can delete roles" ON roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Only users with user.manage_roles can assign roles" ON user_roles;
DROP POLICY IF EXISTS "Only users with user.manage_roles can remove roles" ON user_roles;
DROP POLICY IF EXISTS "Only users with role.edit can manage role permissions" ON role_permissions;
DROP POLICY IF EXISTS "Users with permission can create roles" ON roles;
DROP POLICY IF EXISTS "Users with permission can update roles" ON roles;
DROP POLICY IF EXISTS "Users with permission can delete roles" ON roles;
DROP POLICY IF EXISTS "Users with permission can assign roles" ON user_roles;
DROP POLICY IF EXISTS "Users with permission can revoke roles" ON user_roles;

-- Drop existing functions
DROP FUNCTION IF EXISTS get_user_permissions(UUID) CASCADE;
DROP FUNCTION IF EXISTS user_has_permission(UUID, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS user_has_any_permission(UUID, VARCHAR[]) CASCADE;
DROP FUNCTION IF EXISTS get_user_roles(UUID) CASCADE;
DROP FUNCTION IF EXISTS user_has_resource_permission(UUID, VARCHAR, UUID, VARCHAR) CASCADE;

-- Function: Get all permissions for a user
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE (
  permission_key VARCHAR,
  permission_name VARCHAR,
  module VARCHAR,
  resource VARCHAR,
  action VARCHAR,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.permission_key,
    p.permission_name,
    p.module,
    p.resource,
    p.action,
    p.description
  FROM permissions p
  INNER JOIN role_permissions rp ON p.id = rp.permission_id
  INNER JOIN user_roles ur ON rp.role_id = ur.role_id
  WHERE ur.user_id = p_user_id
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user has specific permission
CREATE OR REPLACE FUNCTION user_has_permission(p_user_id UUID, p_permission_key VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM permissions p
    INNER JOIN role_permissions rp ON p.id = rp.permission_id
    INNER JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND p.permission_key = p_permission_key
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user has any of the permissions
CREATE OR REPLACE FUNCTION user_has_any_permission(p_user_id UUID, p_permission_keys VARCHAR[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM permissions p
    INNER JOIN role_permissions rp ON p.id = rp.permission_id
    INNER JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND p.permission_key = ANY(p_permission_keys)
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get all roles for a user
CREATE OR REPLACE FUNCTION get_user_roles(p_user_id UUID)
RETURNS TABLE (
  role_id UUID,
  role_key VARCHAR,
  role_name VARCHAR,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.role_key,
    r.role_name,
    r.description
  FROM roles r
  INNER JOIN user_roles ur ON r.id = ur.role_id
  WHERE ur.user_id = p_user_id
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check resource-level permission
CREATE OR REPLACE FUNCTION user_has_resource_permission(
  p_user_id UUID,
  p_resource_type VARCHAR,
  p_resource_id UUID,
  p_permission_key VARCHAR
)
RETURNS BOOLEAN AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM resource_permissions
    WHERE user_id = p_user_id
      AND resource_type = p_resource_type
      AND resource_id = p_resource_id
      AND permission_key = p_permission_key
      AND (expires_at IS NULL OR expires_at > NOW())
  ) THEN
    RETURN true;
  END IF;
  
  RETURN user_has_permission(p_user_id, p_resource_type || '.' || p_permission_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. MIGRATE EXISTING USERS TO NEW SYSTEM
-- ============================================================================

-- Assign roles to existing users based on their current role in profiles table
INSERT INTO user_roles (user_id, role_id)
SELECT 
  p.id,
  r.id
FROM profiles p
INNER JOIN roles r ON r.role_key = p.role AND r.is_system_role = true
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id AND ur.role_id = r.id
)
ON CONFLICT (user_id, role_id) DO NOTHING;

-- ============================================================================
-- 10. ENABLE RLS
-- ============================================================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 11. RECREATE RLS POLICIES
-- ============================================================================

-- Roles: Users can view roles in their tenant or system roles
CREATE POLICY "Users can view their tenant roles"
  ON roles FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    OR is_system_role = true
  );

-- Roles: Only users with role.create permission can create roles
CREATE POLICY "Users with permission can create roles"
  ON roles FOR INSERT
  WITH CHECK (
    user_has_permission(auth.uid(), 'role.create')
  );

-- Roles: Only users with role.edit permission can update roles
CREATE POLICY "Users with permission can update roles"
  ON roles FOR UPDATE
  USING (
    user_has_permission(auth.uid(), 'role.edit')
  );

-- Roles: Only users with role.delete permission can delete roles
CREATE POLICY "Users with permission can delete roles"
  ON roles FOR DELETE
  USING (
    user_has_permission(auth.uid(), 'role.delete')
    AND is_system_role = false
  );

-- Permissions: All authenticated users can view permissions
CREATE POLICY "Authenticated users can view permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

-- User Roles: Users can view their own roles
CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid());

-- User Roles: Users with role.assign permission can assign roles
CREATE POLICY "Users with permission can assign roles"
  ON user_roles FOR INSERT
  WITH CHECK (
    user_has_permission(auth.uid(), 'role.assign')
  );

-- User Roles: Users with role.assign permission can revoke roles
CREATE POLICY "Users with permission can revoke roles"
  ON user_roles FOR DELETE
  USING (
    user_has_permission(auth.uid(), 'role.assign')
  );

-- Role Permissions: Users with role.edit can manage
CREATE POLICY "Users with permission can manage role permissions"
  ON role_permissions FOR ALL
  USING (
    user_has_permission(auth.uid(), 'role.edit')
  );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
