# Package: SDK

API SDK for external consumers.

## Responsibilities
- API client
- Type-safe methods
- Error handling
- Authentication

## Structure
```
SDK Package
├── client.ts
├── modules/
│   ├── whatsapp.ts
│   ├── crm.ts
│   ├── chatbot.ts
│   └── broadcast.ts
└── types.ts
```

## Usage
```typescript
import { WhatsAppCRM } from '@packages/sdk';

const client = new WhatsAppCRM({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.example.com'
});

// Send message
await client.whatsapp.sendMessage({
  to: '628123456789',
  message: 'Hello from SDK'
});

// Get contacts
const contacts = await client.crm.contacts.list();
```

## Features
- Type-safe API calls
- Auto-retry on failure
- Request/response logging
- Error handling
- TypeScript support
