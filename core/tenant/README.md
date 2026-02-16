# Core: Tenant Module

Multi-tenancy system untuk isolasi data antar tenant.

## Responsibilities
- Tenant context management
- Organization & workspace management
- Tenant isolation middleware
- Tenant-scoped queries

## Files
- `types.ts` - Type definitions
- `service.ts` - Tenant CRUD operations
- `middleware.ts` - Tenant isolation middleware
- `hooks.ts` - React hooks (useTenant, useOrganization)
- `context.tsx` - React context provider

## Usage
```typescript
import { useTenant } from '@core/tenant';

const { tenant, organization } = useTenant();
```

## Database Schema
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```
