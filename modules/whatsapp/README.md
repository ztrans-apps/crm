# 📱 WhatsApp Module

Multi-tenant WhatsApp infrastructure with queue system, rate limiting, and auto-reconnect.

---

## 📁 Structure

```
modules/whatsapp/
├── core/
│   ├── session-manager.ts    # Multi-tenant session management
│   └── rate-limiter.ts        # Rate limiting (prevent ban)
├── services/
│   └── send.service.ts        # Send messages with queue
└── types.ts                   # TypeScript types
```

---

## 🚀 Features

### Session Manager
- ✅ Multi-tenant session isolation
- ✅ Auto-reconnect on disconnect (max 5 attempts)
- ✅ Exponential backoff (1s → 30s)
- ✅ Session status tracking
- ✅ Database sync
- ✅ Event handlers (qr, ready, authenticated, disconnected)

### Rate Limiter
- ✅ Prevent WhatsApp ban
- ✅ Default: 20 messages/minute per session
- ✅ Tenant-isolated limits
- ✅ Automatic reset
- ✅ Remaining messages counter

### Send Service
- ✅ Send text messages (queued)
- ✅ Send media messages (queued)
- ✅ Send location (queued)
- ✅ Rate limit checking
- ✅ Direct send (bypass queue)

---

## 📖 Usage

### Initialize Session

```typescript
import { sessionManager } from '@/modules/whatsapp/core/session-manager';

const client = await sessionManager.initializeSession({
  tenantId: '00000000-0000-0000-0000-000000000001',
  sessionId: 'session-123',
  phoneNumber: '+6281234567890',
});

// Session will auto-reconnect on disconnect
```

### Send Message

```typescript
import { WhatsAppSendService } from '@/modules/whatsapp/services/send.service';

const sendService = new WhatsAppSendService();

// Send text message (automatically queued + rate limited)
const result = await sendService.sendMessage({
  tenantId: '00000000-0000-0000-0000-000000000001',
  sessionId: 'session-123',
  to: '6281234567890',
  message: 'Hello!',
});

console.log('Job ID:', result.jobId);
```

### Send Media

```typescript
const result = await sendService.sendMedia(
  tenantId,
  sessionId,
  '6281234567890',
  'https://example.com/image.jpg',
  'Check this out!' // caption
);
```

### Send Location

```typescript
const result = await sendService.sendLocation(
  tenantId,
  sessionId,
  '6281234567890',
  -6.2088,  // latitude
  106.8456, // longitude
  'Jakarta, Indonesia' // description
);
```

### Check Rate Limit

```typescript
const status = sendService.getRateLimitStatus(tenantId, sessionId);

console.log({
  remaining: status.remaining,   // Messages left
  resetIn: status.resetIn,       // Milliseconds until reset
  isLimited: status.isLimited,   // Currently limited?
});
```

### Get Session Status

```typescript
import { sessionManager } from '@/modules/whatsapp/core/session-manager';

const status = sessionManager.getSessionStatus(tenantId, sessionId);
// Returns: 'initializing' | 'ready' | 'disconnected' | 'error'
```

### Disconnect Session

```typescript
await sessionManager.disconnectSession(tenantId, sessionId);
```

---

## 🔧 Configuration

### Environment Variables

```env
# WhatsApp
WHATSAPP_SESSION_PATH=./.wwebjs_auth

# Redis (for queue)
REDIS_HOST=localhost
REDIS_PORT=6379

# Multi-tenant
DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000001
```

### Rate Limit Configuration

Default: 20 messages/minute per session

To customize:
```typescript
import { rateLimiter } from '@/modules/whatsapp/core/rate-limiter';

// Check with custom limits
const isLimited = rateLimiter.isRateLimited(
  tenantId,
  sessionId,
  {
    maxMessages: 30,    // 30 messages
    windowMs: 60000,    // per minute
  }
);
```

---

## 🎯 API Routes

### Initialize Session

```typescript
// app/api/whatsapp/session/init/route.ts
import { sessionManager } from '@/modules/whatsapp/core/session-manager';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { tenantId, sessionId, phoneNumber } = await request.json();
  
  const client = await sessionManager.initializeSession({
    tenantId,
    sessionId,
    phoneNumber,
  });
  
  return NextResponse.json({ success: true });
}
```

### Send Message

```typescript
// app/api/whatsapp/send/route.ts
import { WhatsAppSendService } from '@/modules/whatsapp/services/send.service';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { tenantId, sessionId, to, message } = await request.json();
  
  const sendService = new WhatsAppSendService();
  const result = await sendService.sendMessage({
    tenantId,
    sessionId,
    to,
    message,
  });
  
  return NextResponse.json({ jobId: result.jobId });
}
```

---

## 🛡️ Rate Limiting

Rate limiter automatically prevents WhatsApp ban:

- **Default:** 20 messages per minute per session
- **Automatic:** No configuration needed
- **Tenant-isolated:** Each tenant has separate limits
- **Auto-reset:** Limits reset after window expires

### Error Handling

```typescript
try {
  await sendService.sendMessage({ ... });
} catch (error) {
  if (error.message.includes('Rate limit exceeded')) {
    // Wait and retry
    const status = sendService.getRateLimitStatus(tenantId, sessionId);
    console.log(`Wait ${status.resetIn}ms before retry`);
  }
}
```

---

## 🔄 Auto-Reconnect

Session manager automatically reconnects on disconnect:

- **Max attempts:** 5
- **Backoff:** Exponential (1s → 2s → 4s → 8s → 16s → 30s max)
- **Database sync:** Updates session status
- **Event logging:** Tracks reconnect attempts

### Monitor Reconnects

```typescript
// Session manager logs reconnect attempts
// [Session:tenant:session] Reconnect attempt 1/5
// [Session:tenant:session] Reconnect attempt 2/5
// ...
```

---

## 📊 Monitoring

### Session Status

```typescript
const sessions = sessionManager.getTenantSessions(tenantId);

sessions.forEach(session => {
  console.log({
    sessionId: session.config.sessionId,
    status: session.status,
    lastActivity: session.lastActivity,
  });
});
```

### Queue Status

```bash
# Check queue length
redis-cli LLEN bull:whatsapp:send:wait

# Check active jobs
redis-cli LLEN bull:whatsapp:send:active
```

---

## 🐛 Troubleshooting

### Session Not Ready

```
Error: WhatsApp session not ready
```

**Solution:**
1. Check session status: `sessionManager.getSessionStatus()`
2. Wait for 'ready' status
3. Check logs for QR code or errors

### Rate Limit Exceeded

```
Error: Rate limit exceeded. Try again in 45 seconds
```

**This is normal!** Rate limiter is protecting you.

**Options:**
1. Wait for reset
2. Use different session
3. Increase limits (risky!)

### Auto-Reconnect Failed

```
[Session] Max reconnect attempts reached
```

**Solution:**
1. Check WhatsApp Web status
2. Re-initialize session
3. Scan QR code again

---

## 🚀 Next Steps

- [ ] Implement receive service
- [ ] Add webhook router
- [ ] Add delivery tracker
- [ ] Add media service
- [ ] Add group message support
- [ ] Add broadcast support

---

## 📚 Resources

- [WhatsApp Web.js Documentation](https://wwebjs.dev/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Queue System Setup](../../QUEUE-SYSTEM-SETUP.md)

---

**Status:** ✅ Ready for use
**Last Updated:** 2025-02-13
