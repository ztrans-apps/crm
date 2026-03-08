# Performance Analysis Guide

This guide helps you interpret load test results and identify performance bottlenecks.

## Requirements

Based on Requirements 11.1 and 11.2:

- **Response Time**: < 500ms for 95% of requests (p95)
- **Error Rate**: < 1% under normal load
- **Throughput**: Support 1000 concurrent users
- **Database Query Time**: < 200ms for 95% of queries

## Understanding Metrics

### Response Time Percentiles

- **p50 (median)**: 50% of requests complete faster than this time
  - Target: < 200ms
  - Good indicator of typical user experience

- **p95**: 95% of requests complete faster than this time
  - Target: < 500ms (Requirement 11.1)
  - Critical metric for performance SLA

- **p99**: 99% of requests complete faster than this time
  - Target: < 1000ms
  - Indicates worst-case performance for most users

### Error Rate

- Percentage of failed requests (4xx, 5xx status codes)
- Target: < 1% (Requirement 11.2)
- High error rates indicate:
  - Rate limiting issues
  - Database connection exhaustion
  - Application errors under load

### Throughput

- Requests per second (RPS)
- Should remain stable throughout test
- Declining RPS indicates performance degradation

## Common Bottlenecks

### 1. Database Query Performance

**Symptoms:**
- High p95/p99 response times
- Increasing response times over test duration
- Database CPU at 100%

**Diagnosis:**
```bash
# Check slow queries in application logs
grep "slow query" logs/application.log

# Review database query performance
# Check Supabase dashboard for slow queries
```

**Solutions:**
- Add database indexes on frequently queried fields
- Implement query projections (select only needed fields)
- Use pagination for large result sets
- Optimize N+1 queries with proper joins
- Review and optimize complex queries

### 2. Cache Miss Rate

**Symptoms:**
- High database load
- Inconsistent response times
- p95 > 500ms but p50 < 200ms

**Diagnosis:**
```bash
# Check cache hit rate in Redis
redis-cli INFO stats | grep keyspace_hits
redis-cli INFO stats | grep keyspace_misses

# Calculate hit rate: hits / (hits + misses)
```

**Solutions:**
- Increase cache TTL for frequently accessed data
- Implement cache warming for common queries
- Review cache invalidation strategy
- Add caching for expensive operations
- Target: > 70% cache hit rate

### 3. Connection Pool Exhaustion

**Symptoms:**
- Sudden spike in errors at specific load level
- "Connection pool exhausted" errors
- Timeouts under load

**Diagnosis:**
```bash
# Check database connection pool settings
# Review Supabase connection limits
# Monitor active connections during test
```

**Solutions:**
- Increase database connection pool size
- Implement connection pooling with PgBouncer
- Review connection timeout settings
- Optimize long-running queries
- Implement request queuing

### 4. Rate Limiting

**Symptoms:**
- 429 (Too Many Requests) errors
- Errors at predictable intervals
- Specific endpoints failing

**Diagnosis:**
```bash
# Check rate limit violations in logs
grep "rate limit exceeded" logs/application.log

# Review rate limit configuration
cat lib/middleware/rate-limiter.ts
```

**Solutions:**
- Adjust rate limits for load testing
- Implement per-tenant rate limits
- Use Redis for distributed rate limiting
- Add rate limit headers to responses
- Implement exponential backoff in clients

### 5. Memory Leaks

**Symptoms:**
- Increasing response times over test duration
- Memory usage growing continuously
- Eventual crashes or OOM errors

**Diagnosis:**
```bash
# Monitor memory usage during test
# Use Node.js heap snapshots
node --inspect app.js

# Check for memory leaks
npm run test:load -- --vus 100 --duration 30m
```

**Solutions:**
- Review event listener cleanup
- Implement proper connection cleanup
- Use weak references where appropriate
- Profile memory usage with Chrome DevTools
- Implement memory limits and restarts

### 6. CPU Bottlenecks

**Symptoms:**
- High CPU usage (> 80%)
- Increasing response times
- Request queuing

**Diagnosis:**
```bash
# Monitor CPU usage during test
top -p $(pgrep -f "node")

# Profile CPU usage
node --prof app.js
```

**Solutions:**
- Optimize CPU-intensive operations
- Implement caching for expensive computations
- Use worker threads for heavy processing
- Scale horizontally (add more instances)
- Optimize JSON parsing/serialization

## Performance Optimization Checklist

### Database Optimization

- [ ] Add indexes on frequently queried fields
- [ ] Implement query projections (select only needed fields)
- [ ] Use pagination for list endpoints
- [ ] Optimize N+1 queries with joins
- [ ] Review and optimize slow queries
- [ ] Implement connection pooling
- [ ] Use prepared statements

### Caching Strategy

- [ ] Implement Redis caching for frequently accessed data
- [ ] Cache user permissions (5 minutes)
- [ ] Cache tenant configuration (10 minutes)
- [ ] Cache conversation lists (30 seconds)
- [ ] Implement cache invalidation on updates
- [ ] Monitor cache hit rates (target: > 70%)

### API Optimization

- [ ] Implement response compression (gzip)
- [ ] Use HTTP/2 for multiplexing
- [ ] Implement request batching
- [ ] Add pagination to all list endpoints
- [ ] Implement field selection (GraphQL-style)
- [ ] Use ETags for conditional requests

### Infrastructure

- [ ] Scale horizontally (add more instances)
- [ ] Use load balancer for distribution
- [ ] Implement CDN for static assets
- [ ] Use connection pooling (PgBouncer)
- [ ] Monitor resource utilization
- [ ] Implement auto-scaling

## Analyzing Load Test Results

### Step 1: Run Load Tests

```bash
# Run comprehensive load test
npm run test:load:comprehensive

# Or run individual endpoint tests
npm run test:load:contacts
npm run test:load:messages
npm run test:load:broadcasts
npm run test:load:conversations
```

### Step 2: Analyze Results

```bash
# Analyze results with automated tool
node tests/load/analyze-results.js tests/load/results/comprehensive-load-20240101_120000.json
```

### Step 3: Review Metrics

Check the following in order:

1. **Error Rate**: Must be < 1%
   - If > 1%, investigate errors immediately
   - Check application logs for error details

2. **p95 Response Time**: Must be < 500ms
   - If > 500ms, identify slow endpoints
   - Review database query performance

3. **p99 Response Time**: Should be < 1000ms
   - If > 1000ms, investigate outliers
   - Check for slow queries or timeouts

4. **Throughput**: Should remain stable
   - If declining, investigate resource exhaustion
   - Check CPU, memory, database connections

### Step 4: Identify Bottlenecks

Use the automated analysis tool output to identify specific issues:

```
⚠️  PERFORMANCE BOTTLENECKS DETECTED:

   1. High p95 response time: 650ms (target: < 500ms)
      Impact: Users experiencing slow responses
      Recommendation: Review database query optimization, add indexes, implement caching

   2. Slow endpoint: contacts (p95: 800ms)
      Impact: contacts operations are significantly slower than target
      Recommendation: Optimize contacts endpoint: review queries, add caching, implement pagination
```

### Step 5: Implement Fixes

Based on identified bottlenecks:

1. **Database Issues**: Add indexes, optimize queries
2. **Cache Issues**: Increase cache TTL, implement cache warming
3. **Connection Issues**: Increase pool size, implement queuing
4. **Rate Limiting**: Adjust limits, implement backoff
5. **Memory Issues**: Fix leaks, implement cleanup
6. **CPU Issues**: Optimize code, scale horizontally

### Step 6: Re-test

After implementing fixes:

```bash
# Run tests again to verify improvements
npm run test:load:comprehensive

# Compare results
node tests/load/analyze-results.js tests/load/results/comprehensive-load-BEFORE.json
node tests/load/analyze-results.js tests/load/results/comprehensive-load-AFTER.json
```

## Continuous Performance Monitoring

### Production Monitoring

Implement continuous monitoring in production:

1. **Response Time Tracking**
   - Monitor p95/p99 response times
   - Alert when > 500ms for 5 minutes

2. **Error Rate Monitoring**
   - Track 4xx/5xx error rates
   - Alert when > 1% for 5 minutes

3. **Resource Utilization**
   - Monitor CPU, memory, disk usage
   - Alert when > 80% for 10 minutes

4. **Database Performance**
   - Track slow queries (> 200ms)
   - Monitor connection pool usage
   - Alert on connection exhaustion

5. **Cache Performance**
   - Track cache hit rates
   - Alert when < 70% for 10 minutes

### Performance Testing Schedule

- **Daily**: Smoke tests (100 users, 5 minutes)
- **Weekly**: Full load tests (1000 users, 30 minutes)
- **Monthly**: Soak tests (100 users, 4 hours)
- **Before Release**: Comprehensive tests (all scenarios)

## Tools and Resources

### Load Testing Tools

- **k6**: https://k6.io/
- **Artillery**: https://artillery.io/
- **JMeter**: https://jmeter.apache.org/

### Monitoring Tools

- **Sentry**: Error tracking and performance monitoring
- **Datadog**: Infrastructure and application monitoring
- **New Relic**: Application performance monitoring
- **Grafana**: Metrics visualization

### Database Tools

- **Supabase Dashboard**: Query performance and slow queries
- **pgAdmin**: PostgreSQL administration
- **PgHero**: PostgreSQL performance dashboard

### Profiling Tools

- **Chrome DevTools**: Memory and CPU profiling
- **Node.js Inspector**: Built-in profiling
- **clinic.js**: Node.js performance profiling

## References

- Requirements 11.1: Response time tracking
- Requirements 11.2: Database query execution time
- Design Document: Performance Monitoring section
- API Documentation: /api/docs
