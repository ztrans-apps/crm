# Queue Auto-Retry for Failed Jobs

**Date**: February 15, 2026  
**Feature**: Automatic retry for failed queue jobs  
**Status**: ✅ IMPLEMENTED

---

## 🎯 Problem

**Before**:
- Queue jobs retry 3x with exponential backoff (2s, 4s, 8s)
- After 3 failures, job goes to "failed" state
- ❌ Failed jobs stay failed forever
- ❌ Requires manual intervention to retry

**Scenario**:
1. WhatsApp service crashes
2. 10 messages fail to send
3. Service comes back up
4. ❌ Those 10 messages never get sent

---

## ✅ Solution

**Auto-Retry Manager** - Background process that:
1. Checks for failed jobs every 1 minute
2. Waits 5 minutes after failure
3. Retries failed jobs up to 3 more times
4. Tracks retry count per job

**Total Retries**: 3 (immediate) + 3 (delayed) = 6 attempts

---

## 🔧 How It Works

### Retry Flow
```
Job fails → Retry 1 (2s delay)
         → Retry 2 (4s delay)
         → Retry 3 (8s delay)
         → Failed state
         → Wait 5 minutes
         → Auto-retry 1 (new job)
         → Auto-retry 2 (if fails)
         → Auto-retry 3 (if fails)
         → Permanently failed
```

### Configuration
```typescript
{
  maxRetries: 3,              // Retry failed jobs 3 more times
  retryDelay: 5 * 60 * 1000,  // Wait 5 minutes before retry
  checkInterval: 60 * 1000,   // Check every 1 minute
}
```

---

## 📋 Usage

### Automatic (Recommended)
Auto-retry starts automatically with workers:
```bash
npm run workers
```

Output:
```
✅ All workers started successfully
✅ Auto-retry for failed jobs started
```

### Manual Retry via API
Retry all failed jobs in a queue immediately:
```bash
curl -X POST http://localhost:3000/api/queue/retry-all-failed \
  -H "Content-Type: application/json" \
  -d '{"queueName": "whatsapp-send"}'
```

Response:
```json
{
  "success": true,
  "queueName": "whatsapp-send",
  "total": 10,
  "retried": 10
}
```

### Programmatic Usage
```typescript
import { startAutoRetry, getRetryManager } from '@/lib/queue/failed-job-retry';

// Start auto-retry
startAutoRetry({
  maxRetries: 5,              // Custom max retries
  retryDelay: 10 * 60 * 1000, // 10 minutes delay
  checkInterval: 2 * 60 * 1000, // Check every 2 minutes
});

// Get stats
const manager = getRetryManager();
const stats = await manager.getStats();
console.log(stats);

// Manual retry specific queue
await manager.retryAllFailed('whatsapp-send');
```

---

## 📊 Monitoring

### Check Queue Status
```bash
npm run check-queue
```

Output shows failed jobs:
```
Queue: whatsapp-send
  Waiting: 0
  Active: 2
  Completed: 150
  Failed: 5 ⚠️
  Delayed: 0
```

### View Failed Jobs
```bash
curl http://localhost:3000/api/queue/status
```

Response includes failed jobs with details:
```json
{
  "queues": {
    "whatsapp-send": {
      "waiting": 0,
      "active": 2,
      "completed": 150,
      "failed": 5,
      "recentFailed": [
        {
          "id": "12",
          "name": "send-message",
          "failedReason": "Session not found",
          "attemptsMade": 3,
          "timestamp": "2026-02-15T12:00:00Z"
        }
      ]
    }
  }
}
```

---

## 🎯 Benefits

### Before Auto-Retry
- ❌ Failed jobs lost forever
- ❌ Manual intervention required
- ❌ Messages never sent
- ❌ Poor user experience

### After Auto-Retry
- ✅ Failed jobs automatically retried
- ✅ No manual intervention needed
- ✅ Messages eventually sent
- ✅ Better reliability
- ✅ Handles temporary failures (network, service restart)

---

## 🔍 Use Cases

### 1. WhatsApp Service Restart
```
1. Service crashes at 10:00
2. 5 messages fail
3. Service restarts at 10:02
4. At 10:07 (5 min later), auto-retry kicks in
5. All 5 messages sent successfully ✅
```

### 2. Network Timeout
```
1. Network timeout causes 3 failures
2. Job goes to failed state
3. Network recovers
4. After 5 minutes, auto-retry succeeds ✅
```

### 3. Rate Limiting
```
1. WhatsApp rate limit hit
2. Jobs fail temporarily
3. After 5 minutes, rate limit reset
4. Auto-retry succeeds ✅
```

---

## ⚙️ Configuration Options

### Adjust Retry Delay
For faster retry (testing):
```typescript
startAutoRetry({
  retryDelay: 1 * 60 * 1000, // 1 minute
});
```

For slower retry (production):
```typescript
startAutoRetry({
  retryDelay: 15 * 60 * 1000, // 15 minutes
});
```

### Adjust Max Retries
```typescript
startAutoRetry({
  maxRetries: 5, // Retry 5 more times
});
```

### Adjust Check Interval
```typescript
startAutoRetry({
  checkInterval: 30 * 1000, // Check every 30 seconds
});
```

---

## 🧪 Testing

### Test Auto-Retry
```bash
# 1. Start workers
npm run workers

# 2. Send message with invalid session (will fail)
curl -X POST http://localhost:3000/api/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "invalid-session",
    "to": "+6281234567890",
    "message": "Test"
  }'

# 3. Check failed jobs
npm run check-queue

# 4. Wait 5 minutes, check again
# Failed job should be retried automatically
```

### Test Manual Retry
```bash
# Retry all failed jobs immediately
curl -X POST http://localhost:3000/api/queue/retry-all-failed \
  -H "Content-Type: application/json" \
  -d '{"queueName": "whatsapp-send"}'
```

---

## 📁 Files Created

1. `lib/queue/failed-job-retry.ts` - Auto-retry manager
2. `app/api/queue/retry-all-failed/route.ts` - Manual retry API
3. `scripts/start-workers.ts` - Updated to start auto-retry
4. `QUEUE-AUTO-RETRY.md` - This documentation

---

## 🚀 Production Recommendations

### 1. Monitor Failed Jobs
Set up alerts when failed jobs exceed threshold:
```typescript
const stats = await manager.getStats();
if (stats['whatsapp-send'].failed > 10) {
  // Send alert to Slack/email
}
```

### 2. Adjust Retry Delay Based on Error
```typescript
// For rate limit errors: longer delay
// For network errors: shorter delay
// For session errors: medium delay
```

### 3. Dead Letter Queue
After max retries, move to dead letter queue for manual review:
```typescript
if (retryCount >= maxRetries) {
  await moveToDeadLetterQueue(job);
}
```

---

## 💡 Best Practices

1. **Don't retry immediately** - Use delay to allow system to recover
2. **Limit max retries** - Prevent infinite loops
3. **Monitor retry patterns** - Identify systemic issues
4. **Log retry attempts** - For debugging
5. **Alert on high failure rate** - Proactive monitoring

---

## ✅ Status

**Implementation**: Complete  
**Testing**: Ready  
**Production**: Ready  
**Documentation**: Complete

**Auto-retry is now active** when you run `npm run workers`! 🎉
