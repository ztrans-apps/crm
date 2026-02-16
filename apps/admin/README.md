# Admin App

Administration panel for tenant owners and admins.

## Features

- User management
- Role management
- Tenant settings
- Billing management (when enabled)
- Module configuration
- System settings
- Audit logs

## Routes

All routes under `app/(app)/admin/`:

- `/admin/settings` - Tenant settings
- `/admin/roles` - Role management
- `/admin/users` - User management
- `/admin/billing` - Billing settings (when enabled)
- `/admin/modules` - Module configuration
- `/admin/audit` - Audit logs

## Access Control

- Requires authentication
- Requires admin or owner role
- Tenant-based access

## Layout

Uses `app/(app)/layout.tsx` with admin-specific navigation.

## Permissions

Only accessible to users with:
- Role: `owner` or `admin`
- Permission: `admin.access`
