# Billing Module

Core billing and subscription management module.

## Features

- Subscription management
- Usage tracking and limits
- Plan-based feature access
- Multi-tier pricing (Free, Starter, Professional, Enterprise)

## Usage

### Server-side

```typescript
import { BillingService } from '@/core/billing';

// Check subscription
const subscription = await BillingService.getSubscription(tenantId);

// Check feature access
const hasAccess = await BillingService.hasFeature(tenantId, 'advanced_automation');

// Check usage limits
const { allowed, current, limit } = await BillingService.checkLimit(
  tenantId,
  'maxMessagesPerMonth'
);

// Record usage
await BillingService.recordUsage(tenantId, 'messages_sent', 1);
```

### Client-side

```typescript
import { useSubscription, useFeatureAccess, useUsageLimit } from '@/core/billing';

function MyComponent() {
  const { subscription, limits, isActive } = useSubscription(tenantId);
  const { hasAccess } = useFeatureAccess(tenantId, 'broadcast');
  const { current, limit, allowed } = useUsageLimit(tenantId, 'maxMessagesPerMonth');
  
  return (
    <div>
      <p>Plan: {subscription?.plan}</p>
      <p>Messages: {current} / {limit}</p>
    </div>
  );
}
```

## Database Schema

Required tables:

```sql
-- subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  trial_end TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- usage_records table
CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  metric TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  metadata JSONB
);
```
