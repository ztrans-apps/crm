# Module: CRM

Customer Relationship Management functionality.

## Responsibilities
- Contact management
- Conversation handling
- Ticket system
- Customer data
- Interaction history

## Structure
```
CRM Module
├── contacts/
│   ├── service.ts
│   ├── api.ts
│   └── types.ts
├── conversations/
│   ├── service.ts
│   ├── api.ts
│   └── types.ts
├── tickets/
│   ├── service.ts
│   ├── api.ts
│   └── types.ts
└── index.ts
```

## Features
- Contact CRUD operations
- Conversation management
- Ticket lifecycle
- Customer segmentation
- Interaction tracking

## Usage
```typescript
import { ContactService } from '@modules/crm/contacts';

const contactService = new ContactService(tenantId);

// Create contact
const contact = await contactService.create({
  name: 'John Doe',
  phone: '628123456789',
  email: 'john@example.com'
});
```
