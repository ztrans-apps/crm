-- ============================================================================
-- RBAC Enhancement: Role Hierarchy & Templates
-- ============================================================================
-- This migration adds role hierarchy and template support

-- ============================================================================
-- 1. ADD ROLE HIERARCHY SUPPORT
-- ============================================================================

-- Add parent_role_id for role inheritance
ALTER TABLE roles ADD COLUMN IF NOT EXISTS parent_role_id UUID REFERENCES roles(id) ON DELETE SET NULL;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS hierarchy_level INTEGER DEFAULT 0;

-- Index for hierarchy queries
CREATE INDEX IF NOT EXISTS idx_roles_parent ON roles(parent_role_id);
CREATE INDEX IF NOT EXISTS idx_roles_hierarchy ON roles(hierarchy_level);

-- ============================================================================
-- 2. ADD ROLE TEMPLATES SUPPORT
-- ============================================================================

-- Add template flag
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS template_category VARCHAR(50);

-- Index for templates
CREATE INDEX IF NOT EXISTS idx_roles_template ON roles(is_template) WHERE is_template = true;

-- ============================================================================
-- 3. ROLE HIERARCHY LEVELS
-- ============================================================================

-- Update system roles with hierarchy levels
UPDATE roles SET hierarchy_level = 100 WHERE role_key = 'owner' AND is_system_role = true;
UPDATE roles SET hierarchy_level = 50 WHERE role_key = 'supervisor' AND is_system_role = true;
UPDATE roles SET hierarchy_level = 10 WHERE role_key = 'agent' AND is_system_role = true;

-- Set supervisor parent to owner
UPDATE roles 
SET parent_role_id = (SELECT id FROM roles WHERE role_key = 'owner' AND is_system_role = true)
WHERE role_key = 'supervisor' AND is_system_role = true;

-- Set agent parent to supervisor
UPDATE roles 
SET parent_role_id = (SELECT id FROM roles WHERE role_key = 'supervisor' AND is_system_role = true)
WHERE role_key = 'agent' AND is_system_role = true;

-- ============================================================================
-- 4. CREATE ROLE TEMPLATES
-- ============================================================================

-- Customer Support Agent Template
INSERT INTO roles (
  role_key, 
  role_name, 
  description, 
  is_system_role, 
  is_template,
  template_category,
  hierarchy_level,
  tenant_id
) VALUES (
  'template_support_agent',
  'Customer Support Agent',
  'Basic agent with conversation and contact access',
  false,
  true,
  'support',
  10,
  NULL
) ON CONFLICT (tenant_id, role_key) DO NOTHING;

-- Assign permissions to Customer Support Agent template
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE role_key = 'template_support_agent' AND is_template = true),
  id
FROM permissions
WHERE permission_key IN (
  'chat.view.assigned',
  'chat.reply',
  'chat.pick',
  'chat.handover',
  'contact.view',
  'contact.edit',
  'label.view',
  'label.apply',
  'note.view',
  'note.create',
  'note.edit.own',
  'analytics.view.own'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Team Lead Template
INSERT INTO roles (
  role_key, 
  role_name, 
  description, 
  is_system_role, 
  is_template,
  template_category,
  hierarchy_level,
  tenant_id
) VALUES (
  'template_team_lead',
  'Team Lead',
  'Supervisor with team management capabilities',
  false,
  true,
  'management',
  50,
  NULL
) ON CONFLICT (tenant_id, role_key) DO NOTHING;

-- Assign permissions to Team Lead template
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE role_key = 'template_team_lead' AND is_template = true),
  id
FROM permissions
WHERE permission_key IN (
  'chat.view.all',
  'chat.view.team',
  'chat.reply',
  'chat.assign',
  'chat.close',
  'chat.reopen',
  'contact.view',
  'contact.create',
  'contact.edit',
  'label.view',
  'label.create',
  'label.apply',
  'note.view',
  'note.create',
  'note.edit.all',
  'broadcast.view',
  'broadcast.create',
  'broadcast.send',
  'analytics.view.team',
  'analytics.view.all'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Marketing Manager Template
INSERT INTO roles (
  role_key, 
  role_name, 
  description, 
  is_system_role, 
  is_template,
  template_category,
  hierarchy_level,
  tenant_id
) VALUES (
  'template_marketing_manager',
  'Marketing Manager',
  'Focused on broadcast and analytics',
  false,
  true,
  'marketing',
  50,
  NULL
) ON CONFLICT (tenant_id, role_key) DO NOTHING;

-- Assign permissions to Marketing Manager template
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE role_key = 'template_marketing_manager' AND is_template = true),
  id
FROM permissions
WHERE permission_key IN (
  'contact.view',
  'contact.create',
  'contact.edit',
  'contact.import',
  'contact.export',
  'broadcast.view',
  'broadcast.create',
  'broadcast.edit',
  'broadcast.send',
  'broadcast.schedule',
  'analytics.view.all',
  'analytics.export'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Read-Only Viewer Template
INSERT INTO roles (
  role_key, 
  role_name, 
  description, 
  is_system_role, 
  is_template,
  template_category,
  hierarchy_level,
  tenant_id
) VALUES (
  'template_viewer',
  'Read-Only Viewer',
  'View-only access for monitoring',
  false,
  true,
  'viewer',
  5,
  NULL
) ON CONFLICT (tenant_id, role_key) DO NOTHING;

-- Assign permissions to Read-Only Viewer template
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE role_key = 'template_viewer' AND is_template = true),
  id
FROM permissions
WHERE permission_key IN (
  'chat.view.all',
  'contact.view',
  'label.view',
  'note.view',
  'broadcast.view',
  'analytics.view.all'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- 5. FUNCTIONS FOR ROLE HIERARCHY
-- ============================================================================

-- Function: Get all permissions including inherited from parent roles
CREATE OR REPLACE FUNCTION get_user_permissions_with_inheritance(p_user_id UUID)
RETURNS TABLE (
  permission_key VARCHAR,
  permission_name VARCHAR,
  module VARCHAR,
  resource VARCHAR,
  action VARCHAR,
  description TEXT,
  inherited_from VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE role_hierarchy AS (
    -- Get user's direct roles
    SELECT 
      r.id,
      r.role_key,
      r.role_name,
      r.parent_role_id,
      r.hierarchy_level,
      0 as depth
    FROM roles r
    INNER JOIN user_roles ur ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    
    UNION ALL
    
    -- Get parent roles recursively
    SELECT 
      r.id,
      r.role_key,
      r.role_name,
      r.parent_role_id,
      r.hierarchy_level,
      rh.depth + 1
    FROM roles r
    INNER JOIN role_hierarchy rh ON r.id = rh.parent_role_id
    WHERE rh.depth < 10 -- Prevent infinite loops
  )
  SELECT DISTINCT
    p.permission_key,
    p.permission_name,
    p.module,
    p.resource,
    p.action,
    p.description,
    rh.role_name as inherited_from
  FROM permissions p
  INNER JOIN role_permissions rp ON p.id = rp.permission_id
  INNER JOIN role_hierarchy rh ON rp.role_id = rh.id
  ORDER BY p.module, p.permission_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user has permission (with inheritance)
CREATE OR REPLACE FUNCTION user_has_permission_with_inheritance(p_user_id UUID, p_permission_key VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM get_user_permissions_with_inheritance(p_user_id)
    WHERE permission_key = p_permission_key
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get role hierarchy path
CREATE OR REPLACE FUNCTION get_role_hierarchy_path(p_role_id UUID)
RETURNS TABLE (
  role_id UUID,
  role_key VARCHAR,
  role_name VARCHAR,
  hierarchy_level INTEGER,
  depth INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE role_path AS (
    -- Start with the given role
    SELECT 
      r.id,
      r.role_key,
      r.role_name,
      r.hierarchy_level,
      0 as depth
    FROM roles r
    WHERE r.id = p_role_id
    
    UNION ALL
    
    -- Get parent roles
    SELECT 
      r.id,
      r.role_key,
      r.role_name,
      r.hierarchy_level,
      rp.depth + 1
    FROM roles r
    INNER JOIN role_path rp ON r.id = (
      SELECT parent_role_id FROM roles WHERE id = rp.role_id
    )
    WHERE rp.depth < 10
  )
  SELECT * FROM role_path ORDER BY depth;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if role A is higher than role B in hierarchy
CREATE OR REPLACE FUNCTION is_role_higher_than(p_role_a_id UUID, p_role_b_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_level_a INTEGER;
  v_level_b INTEGER;
BEGIN
  SELECT hierarchy_level INTO v_level_a FROM roles WHERE id = p_role_a_id;
  SELECT hierarchy_level INTO v_level_b FROM roles WHERE id = p_role_b_id;
  
  RETURN v_level_a > v_level_b;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. UPDATE RLS POLICIES FOR HIERARCHY
-- ============================================================================

-- Users can only assign roles at their level or below
CREATE POLICY "Users can only assign roles at or below their level"
  ON user_roles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_roles ur1
      INNER JOIN roles r1 ON ur1.role_id = r1.id
      INNER JOIN roles r2 ON r2.id = user_roles.role_id
      WHERE ur1.user_id = auth.uid()
        AND r1.hierarchy_level >= r2.hierarchy_level
    )
    OR user_has_permission(auth.uid(), 'role.assign')
  );

-- ============================================================================
-- 7. TRIGGERS FOR HIERARCHY VALIDATION
-- ============================================================================

-- Trigger: Prevent circular hierarchy
CREATE OR REPLACE FUNCTION prevent_circular_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if setting parent would create a circular reference
  IF NEW.parent_role_id IS NOT NULL THEN
    IF EXISTS (
      WITH RECURSIVE role_path AS (
        SELECT id, parent_role_id, 1 as depth
        FROM roles
        WHERE id = NEW.parent_role_id
        
        UNION ALL
        
        SELECT r.id, r.parent_role_id, rp.depth + 1
        FROM roles r
        INNER JOIN role_path rp ON r.id = rp.parent_role_id
        WHERE rp.depth < 10
      )
      SELECT 1 FROM role_path WHERE id = NEW.id
    ) THEN
      RAISE EXCEPTION 'Circular role hierarchy detected';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_circular_hierarchy
  BEFORE INSERT OR UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_circular_hierarchy();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Role hierarchy and templates are now implemented:
-- ✓ Role inheritance (parent_role_id)
-- ✓ Hierarchy levels (hierarchy_level)
-- ✓ Role templates (is_template, template_category)
-- ✓ 4 pre-configured templates
-- ✓ Functions for hierarchy queries
-- ✓ Permission inheritance
-- ✓ Circular hierarchy prevention
-- ✓ RLS policies for hierarchy-based access control
