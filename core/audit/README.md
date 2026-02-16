# Core: Audit Module

Enterprise-grade audit logging system.

## Responsibilities
- Track all data changes
- Record user actions
- Compliance & security
- Audit trail viewer

## Files
- `types.ts` - Type definitions
- `service.ts` - Audit log operations
- `middleware.ts` - Auto-capture middleware
- `hooks.ts` - React hooks

## Usage
```typescript
import { useAuditLog } from '@core/audit';

const { logAction } = useAuditLog();

await logAction({
  action: 'UPDATE',
  resource_type: 'contact',
  resource_id: contactId,
  old_value: oldData,
  new_value: newData
});
```

## Database Schema
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
```
