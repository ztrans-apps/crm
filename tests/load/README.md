# Load Testing

This directory contains load testing scripts using k6 to validate API performance under various load conditions.

## Prerequisites

1. Install k6: https://k6.io/docs/getting-started/installation/
2. Set up environment variables in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `TEST_USER_EMAIL` (test user credentials)
   - `TEST_USER_PASSWORD`

## Quick Start

### Performance Verification (Task 26.3)

```bash
# 1. Check if system is ready for testing
npm run test:performance:check

# 2. Run comprehensive performance verification
npm run test:performance:verify
```

This will verify all performance targets:
- Response time < 500ms for 95% of requests
- Error rate < 1% under normal load
- Cache hit rate > 70%
- Database query time < 100ms for 95% of queries

See [PERFORMANCE_VERIFICATION.md](./PERFORMANCE_VERIFICATION.md) for detailed documentation.

## Running Load Tests

### Individual Endpoint Tests

```bash
# Test contacts API
k6 run tests/load/contacts-load.js

# Test messages API
k6 run tests/load/messages-load.js

# Test broadcasts API
k6 run tests/load/broadcasts-load.js

# Test conversations API
k6 run tests/load/conversations-load.js
```

### Full Load Test Suite

```bash
# Run all load tests
npm run test:load
```

### Custom Load Levels

```bash
# Test with 100 concurrent users
k6 run --vus 100 --duration 30s tests/load/contacts-load.js

# Test with 500 concurrent users
k6 run --vus 500 --duration 60s tests/load/contacts-load.js

# Test with 1000 concurrent users
k6 run --vus 1000 --duration 120s tests/load/contacts-load.js
```

## Performance Targets

Based on Requirements 11.1, 11.2, and 11.3:

- **Response Time (p95)**: < 500ms for 95% of requests (Requirement 11.1)
- **Error Rate**: < 1% under normal load (Requirement 11.2)
- **Cache Hit Rate**: > 70% (Requirement 11.3)
- **Database Query Time (p95)**: < 100ms for 95% of queries (Requirement 11.3)

## Documentation

- **[PERFORMANCE_VERIFICATION.md](./PERFORMANCE_VERIFICATION.md)**: Comprehensive guide for verifying performance targets (Task 26.3)
- **[LOAD_TEST_SUMMARY.md](./LOAD_TEST_SUMMARY.md)**: Overview of load testing infrastructure (Task 26.1)
- **[PERFORMANCE_ANALYSIS.md](./PERFORMANCE_ANALYSIS.md)**: Guide for analyzing results and identifying bottlenecks
- **[QUICKSTART.md](./QUICKSTART.md)**: 5-minute quick start guide
- **[TASK_26.3_SUMMARY.md](./TASK_26.3_SUMMARY.md)**: Implementation summary for Task 26.3

## Test Scenarios

### 1. Contacts API (`contacts-load.js`)
- GET /api/contacts (list contacts)
- POST /api/contacts (create contact)
- GET /api/contacts/[id] (get contact)
- PUT /api/contacts/[id] (update contact)

### 2. Messages API (`messages-load.js`)
- GET /api/messages/[messageId] (get message)
- POST /api/send-message (send message)

### 3. Broadcasts API (`broadcasts-load.js`)
- GET /api/broadcasts (list broadcasts)
- POST /api/broadcasts (create broadcast)
- GET /api/broadcasts/[id] (get broadcast)
- GET /api/broadcasts/[id]/stats (get stats)

### 4. Conversations API (`conversations-load.js`)
- GET /api/chat/conversations (list conversations)
- GET /api/chat/operations (conversation operations)

## Metrics Collected

- **Response Time**: p50, p95, p99 percentiles
- **Request Rate**: requests per second
- **Error Rate**: percentage of failed requests
- **Throughput**: data transferred
- **Concurrent Users**: virtual users (VUs)

## Interpreting Results

### Success Criteria
- ✅ p95 response time < 500ms
- ✅ p99 response time < 1000ms
- ✅ Error rate < 1%
- ✅ All requests complete successfully under target load

### Warning Signs
- ⚠️ p95 response time > 500ms
- ⚠️ p99 response time > 1000ms
- ⚠️ Error rate > 1%
- ⚠️ Increasing response times over test duration

### Failure Indicators
- ❌ p95 response time > 1000ms
- ❌ Error rate > 5%
- ❌ Timeouts or connection errors
- ❌ Database connection pool exhaustion
