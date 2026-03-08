# Load Testing Quick Start Guide

Get started with load testing in 5 minutes!

## Prerequisites

### 1. Install k6

**macOS:**
```bash
brew install k6
```

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows:**
```powershell
choco install k6
```

Or download from: https://k6.io/docs/getting-started/installation/

### 2. Set Environment Variables

Create a `.env.load-test` file:

```bash
# API Base URL
BASE_URL=http://localhost:3000

# Test User Credentials
TEST_USER_EMAIL=your-test-user@example.com
TEST_USER_PASSWORD=your-test-password
```

Load the environment:
```bash
source .env.load-test
```

### 3. Start Your Application

```bash
npm run dev
```

## Running Load Tests

### Quick Test (5 minutes)

Test all endpoints with 100 concurrent users:

```bash
npm run test:load:comprehensive
```

### Individual Endpoint Tests

Test specific endpoints:

```bash
# Contacts API
npm run test:load:contacts

# Messages API
npm run test:load:messages

# Broadcasts API
npm run test:load:broadcasts

# Conversations API
npm run test:load:conversations
```

### Full Test Suite

Run all tests and generate a report:

```bash
npm run test:load
```

This will:
1. Run all individual endpoint tests
2. Run comprehensive load test
3. Generate a detailed report in `tests/load/results/`

## Understanding Results

### Success Criteria

✅ **PASSED** if:
- p95 response time < 500ms
- Error rate < 1%
- All requests complete successfully

❌ **FAILED** if:
- p95 response time > 500ms
- Error rate > 1%
- Timeouts or connection errors

### Example Output

```
     ✓ GET /api/contacts: status is 200
     ✓ GET /api/contacts: response time < 500ms
     ✓ GET /api/contacts: response time < 1000ms
     ✓ GET /api/contacts: has valid JSON

     checks.........................: 100.00% ✓ 4000      ✗ 0
     data_received..................: 2.1 MB  35 kB/s
     data_sent......................: 1.2 MB  20 kB/s
     http_req_blocked...............: avg=1.2ms    min=0s       med=0s       max=50ms     p(95)=5ms
     http_req_connecting............: avg=0.8ms    min=0s       med=0s       max=30ms     p(95)=3ms
     http_req_duration..............: avg=250ms    min=50ms     med=200ms    max=800ms    p(95)=450ms ✓
     http_req_failed................: 0.00%   ✓ 0         ✗ 1000
     http_req_receiving.............: avg=1ms      min=0s       med=0s       max=10ms     p(95)=3ms
     http_req_sending...............: avg=0.5ms    min=0s       med=0s       max=5ms      p(95)=2ms
     http_req_waiting...............: avg=248ms    min=48ms     med=198ms    max=795ms    p(95)=448ms
     http_reqs......................: 1000    16.67/s
     iteration_duration.............: avg=5.2s     min=4s       med=5s       max=8s       p(95)=6.5s
     iterations.....................: 200     3.33/s
     vus............................: 100     min=0       max=100
     vus_max........................: 100     min=100     max=100
```

### Key Metrics

- **http_req_duration p(95)**: 95th percentile response time (must be < 500ms)
- **http_req_failed**: Error rate (must be < 1%)
- **http_reqs**: Requests per second (throughput)
- **checks**: Percentage of successful validations

## Analyzing Results

### Automated Analysis

```bash
# Analyze a specific test result
node tests/load/analyze-results.js tests/load/results/contacts-load-20240101_120000.json
```

Output:
```
📊 Analyzing: tests/load/results/contacts-load-20240101_120000.json

═══════════════════════════════════════════════════════════
                  PERFORMANCE SUMMARY
═══════════════════════════════════════════════════════════

📈 Response Time Percentiles:
   p50 (median): 200.00ms ✅
   p95:          450.00ms ✅
   p99:          800.00ms ✅
   Average:      250.00ms
   Min:          50.00ms
   Max:          800.00ms

❌ Error Rate:
   Errors:       0
   Total:        1000
   Rate:         0.00% ✅

🎯 Endpoint Performance:
   contacts:
     p95: 450.00ms ✅
     avg: 250.00ms

✅ No performance bottlenecks detected!

═══════════════════════════════════════════════════════════
   OVERALL: ✅ PASSED
═══════════════════════════════════════════════════════════
```

## Custom Load Levels

### Light Load (10 users)

```bash
k6 run --vus 10 --duration 30s tests/load/contacts-load.js
```

### Normal Load (100 users)

```bash
k6 run --vus 100 --duration 60s tests/load/contacts-load.js
```

### High Load (500 users)

```bash
k6 run --vus 500 --duration 120s tests/load/contacts-load.js
```

### Stress Test (1000 users)

```bash
k6 run --vus 1000 --duration 180s tests/load/contacts-load.js
```

## Troubleshooting

### Authentication Fails

**Problem:** "Authentication failed during setup"

**Solution:**
1. Verify `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` are set
2. Ensure the user exists in your database
3. Check that the API is running and accessible

```bash
# Test authentication manually
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword"}'
```

### High Error Rates

**Problem:** Error rate > 1%

**Solution:**
1. Check application logs for errors
2. Verify database is running and accessible
3. Check rate limiting configuration
4. Ensure sufficient database connections

```bash
# Check application logs
tail -f logs/application.log

# Check database connections
# Review Supabase dashboard
```

### Slow Response Times

**Problem:** p95 > 500ms

**Solution:**
1. Review database query performance
2. Check cache hit rates
3. Add database indexes
4. Implement query optimization

See [PERFORMANCE_ANALYSIS.md](./PERFORMANCE_ANALYSIS.md) for detailed guidance.

### Connection Errors

**Problem:** "Connection refused" or timeouts

**Solution:**
1. Ensure application is running
2. Verify `BASE_URL` is correct
3. Check firewall settings
4. Increase connection timeout

```bash
# Test connectivity
curl http://localhost:3000/api/health
```

## Next Steps

1. **Review Results**: Check the generated report in `tests/load/results/`
2. **Identify Bottlenecks**: Use the analysis tool to find performance issues
3. **Optimize**: Implement recommended fixes
4. **Re-test**: Run tests again to verify improvements
5. **Monitor**: Set up continuous performance monitoring

## Resources

- [Load Testing README](./README.md) - Detailed documentation
- [Performance Analysis Guide](./PERFORMANCE_ANALYSIS.md) - Bottleneck identification
- [k6 Documentation](https://k6.io/docs/) - Official k6 docs
- [Requirements Document](../../.kiro/specs/security-optimization/requirements.md) - Performance requirements

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review application logs
3. Check the [Performance Analysis Guide](./PERFORMANCE_ANALYSIS.md)
4. Consult the team for assistance

Happy load testing! 🚀
