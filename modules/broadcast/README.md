# Module: Broadcast

Campaign & broadcast management.

## Responsibilities
- Campaign creation
- Message scheduling
- Audience segmentation
- Delivery tracking
- Analytics

## Structure
```
Broadcast Module
├── services/
│   ├── campaign.service.ts
│   ├── scheduler.service.ts
│   └── segmentation.service.ts
├── api/
│   └── routes.ts
└── types.ts
```

## Features
- Bulk messaging
- Scheduled campaigns
- Audience targeting
- A/B testing
- Performance analytics

## Usage
```typescript
import { CampaignService } from '@modules/broadcast';

const campaign = new CampaignService(tenantId);

// Create campaign
await campaign.create({
  name: 'Promo Ramadan',
  message: 'Diskon 50%!',
  segment: 'active_customers',
  schedule: '2024-03-15 09:00'
});
```
