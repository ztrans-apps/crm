# Deployment Runbook
## Security-Optimized WhatsApp CRM System

**Version**: 1.0  
**Last Updated**: March 8, 2026  
**Owner**: DevOps Team

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Database Migrations](#database-migrations)
4. [Deployment Procedures](#deployment-procedures)
5. [Rollback Procedures](#rollback-procedures)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Monitoring and Alerting](#monitoring-and-alerting)
8. [Incident Response](#incident-response)
9. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Dependencies

- [ ] Node.js v20+ installed
- [ ] npm v10+ installed
- [ ] PostgreSQL 15+ (Supabase)
- [ ] Redis 7+ (Upstash or self-hosted)
- [ ] SSL certificates configured

### Environment Variables

- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- [ ] `ENCRYPTION_MASTER_KEY` - 32+ character encryption key
- [ ] `ENCRYPTION_KEY_ROTATION_DAYS` - Key rotation period (default: 90)
- [ ] `UPSTASH_REDIS_REST_URL` - Redis REST URL
- [ ] `UPSTASH_REDIS_REST_TOKEN` - Redis REST token
- [ ] `META_WHATSAPP_TOKEN` - WhatsApp Business API token
- [ ] `META_WHATSAPP_PHONE_NUMBER_ID` - WhatsApp phone number ID
- [ ] `META_WHATSAPP_BUSINESS_ACCOUNT_ID` - WhatsApp business account ID
- [ ] `META_WEBHOOK_VERIFY_TOKEN` - Webhook verification token
- [ ] `NEXT_PUBLIC_API_URL` - API base URL
- [ ] `SENTRY_DSN` - Sentry error tracking DSN (optional)

### Code Quality

- [ ] All tests passing (minimum 80%)
- [ ] No critical security vulnerabilities (`npm audit`)
- [ ] Code reviewed and approved
- [ ] Documentation updated

### Infrastructure

- [ ] Staging environment tested
- [ ] Database backup completed
- [ ] Redis cluster healthy
- [ ] CDN configured
- [ ] Load balancer configured

---

## Environment Configuration

### Production Environment Variables

Create `.env.production` file:

```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.yourcompany.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Encryption
ENCRYPTION_MASTER_KEY=your-32-character-or-longer-master-key
ENCRYPTION_KEY_ROTATION_DAYS=90

# Redis
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# WhatsApp
META_WHATSAPP_TOKEN=your-whatsapp-token
META_WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
META_WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-account-id
META_WEBHOOK_VERIFY_TOKEN=your-webhook-verify-token

# Monitoring
SENTRY_DSN=your-sentry-dsn
NEXT_PUBLIC_SENTRY_DSN=your-public-sentry-dsn

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_SECONDS=3600
RATE_LIMIT_MAX_REQUESTS=1000

# Session Management
SESSION_INACTIVITY_TIMEOUT=1800
SESSION_ABSOLUTE_TIMEOUT=86400
SESSION_MAX_CONCURRENT=5
```

### Security Configuration

1. **Generate Encryption Master Key**:
```bash
openssl rand -base64 32
```

2. **Generate Webhook Verify Token**:
```bash
openssl rand -hex 32
```

3. **Configure CORS Whitelist**:
```typescript
// middleware.ts
const ALLOWED_ORIGINS = [
  'https://yourcompany.com',
  'https://www.yourcompany.com',
  'https://app.yourcompany.com',
]
```

---

## Database Migrations

### Pre-Migration Backup

```bash
# Backup database
pg_dump -h your-db-host -U your-user -d your-database > backup_$(date +%Y%m%d_%H%M%S).sql

# Or use Supabase CLI
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql
```

### Run Migrations

```bash
# Apply all pending migrations
npm run migrate

# Or use Supabase CLI
supabase db push
```

### Verify Migrations

```bash
# Check migration status
npm run migrate:status

# Verify tables exist
psql -h your-db-host -U your-user -d your-database -c "\dt"
```

### Required Tables

- [ ] `profiles` - User profiles with tenant_id
- [ ] `contacts` - Contact information
- [ ] `conversations` - Conversation threads
- [ ] `messages` - Message history
- [ ] `broadcast_campaigns` - Broadcast campaigns
- [ ] `roles` - RBAC roles
- [ ] `permissions` - RBAC permissions
- [ ] `user_permissions` - User permission assignments
- [ ] `api_keys` - API key management
- [ ] `audit_logs` - Audit trail
- [ ] `security_events` - Security event log
- [ ] `blocked_entities` - IP/user blocks
- [ ] `file_uploads` - File metadata
- [ ] `sessions` - Session management (if using database sessions)

---

## Deployment Procedures

### Zero-Downtime Deployment

#### Step 1: Pre-Deployment

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm ci --production

# 3. Build application
npm run build

# 4. Run tests
npm test -- --run

# 5. Check for vulnerabilities
npm audit --production
```

#### Step 2: Database Migration

```bash
# 1. Backup database
npm run db:backup

# 2. Run migrations
npm run migrate

# 3. Verify migrations
npm run migrate:verify
```

#### Step 3: Deploy Application

**Option A: Docker Deployment**

```bash
# 1. Build Docker image
docker build -t whatsapp-crm:latest .

# 2. Tag image
docker tag whatsapp-crm:latest registry.yourcompany.com/whatsapp-crm:v1.0.0

# 3. Push to registry
docker push registry.yourcompany.com/whatsapp-crm:v1.0.0

# 4. Deploy to Kubernetes
kubectl apply -f k8s/deployment.yaml
kubectl rollout status deployment/whatsapp-crm

# 5. Verify pods
kubectl get pods -l app=whatsapp-crm
```

**Option B: Vercel Deployment**

```bash
# 1. Deploy to Vercel
vercel --prod

# 2. Verify deployment
vercel inspect <deployment-url>
```

**Option C: PM2 Deployment**

```bash
# 1. Start application with PM2
pm2 start npm --name "whatsapp-crm" -- start

# 2. Save PM2 configuration
pm2 save

# 3. Set up PM2 startup script
pm2 startup
```

#### Step 4: Health Check

```bash
# Wait for application to start
sleep 30

# Check health endpoint
curl https://api.yourcompany.com/api/health

# Expected response:
# {"status":"healthy","timestamp":"2026-03-08T..."}
```

#### Step 5: Smoke Tests

```bash
# Run smoke tests
npm run test:smoke

# Or manual checks:
curl -X GET https://api.yourcompany.com/api/health
curl -X GET https://api.yourcompany.com/api/health/ready
curl -X GET https://api.yourcompany.com/api/health/live
```

---

## Rollback Procedures

### Immediate Rollback

If critical issues are detected:

**Option A: Kubernetes Rollback**

```bash
# Rollback to previous deployment
kubectl rollout undo deployment/whatsapp-crm

# Verify rollback
kubectl rollout status deployment/whatsapp-crm
```

**Option B: Vercel Rollback**

```bash
# List deployments
vercel ls

# Rollback to specific deployment
vercel rollback <deployment-url>
```

**Option C: PM2 Rollback**

```bash
# Stop current version
pm2 stop whatsapp-crm

# Checkout previous version
git checkout <previous-commit>

# Rebuild
npm ci --production
npm run build

# Restart
pm2 restart whatsapp-crm
```

### Database Rollback

```bash
# Restore from backup
psql -h your-db-host -U your-user -d your-database < backup_YYYYMMDD_HHMMSS.sql

# Or use Supabase CLI
supabase db restore backup_YYYYMMDD_HHMMSS.sql
```

### Rollback Verification

- [ ] Application starts successfully
- [ ] Health checks pass
- [ ] Database queries work
- [ ] Redis connection established
- [ ] Authentication works
- [ ] Critical features functional

---

## Post-Deployment Verification

### Automated Checks

```bash
# Run post-deployment tests
npm run test:post-deploy

# Check all health endpoints
curl https://api.yourcompany.com/api/health
curl https://api.yourcompany.com/api/health/ready
curl https://api.yourcompany.com/api/health/live
```

### Manual Verification

1. **Authentication**
   - [ ] Login works
   - [ ] Logout works
   - [ ] Session management works
   - [ ] Password reset works

2. **Core Features**
   - [ ] Create contact
   - [ ] Send message
   - [ ] Create broadcast
   - [ ] View conversations
   - [ ] Search contacts

3. **Security**
   - [ ] Rate limiting works
   - [ ] CORS headers present
   - [ ] Security headers present
   - [ ] Encryption works
   - [ ] Audit logging works

4. **Performance**
   - [ ] Response time < 500ms (p95)
   - [ ] Error rate < 1%
   - [ ] Cache hit rate > 70%
   - [ ] Database query time < 100ms (p95)

### Monitoring Dashboard

Check the following metrics:

- [ ] Request rate
- [ ] Error rate
- [ ] Response time (p50, p95, p99)
- [ ] Database connections
- [ ] Redis connections
- [ ] Memory usage
- [ ] CPU usage
- [ ] Cache hit rate

---

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Application Metrics**
   - Request rate (requests/second)
   - Error rate (%)
   - Response time (ms) - p50, p95, p99
   - Active users
   - Active sessions

2. **Infrastructure Metrics**
   - CPU usage (%)
   - Memory usage (%)
   - Disk usage (%)
   - Network I/O
   - Database connections
   - Redis connections

3. **Security Metrics**
   - Failed authentication attempts
   - Rate limit violations
   - Blocked IPs
   - Security events
   - Intrusion detection alerts

4. **Business Metrics**
   - Messages sent
   - Broadcasts created
   - Contacts created
   - Active conversations
   - API key usage

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Error rate | > 1% | > 5% |
| Response time (p95) | > 500ms | > 1000ms |
| CPU usage | > 70% | > 90% |
| Memory usage | > 80% | > 95% |
| Database connections | > 80% | > 95% |
| Failed auth attempts | > 10/min | > 50/min |
| Rate limit violations | > 100/min | > 500/min |

### Monitoring Tools

- **Application Performance**: Sentry, New Relic, or Datadog
- **Infrastructure**: Prometheus + Grafana, CloudWatch, or Datadog
- **Logs**: ELK Stack, Loki, or CloudWatch Logs
- **Uptime**: Pingdom, UptimeRobot, or StatusCake

---

## Incident Response

### Severity Levels

**P0 - Critical**
- System down
- Data breach
- Security vulnerability exploited
- Response time: Immediate

**P1 - High**
- Major feature broken
- Performance degradation
- Security alert
- Response time: < 1 hour

**P2 - Medium**
- Minor feature broken
- Non-critical bug
- Response time: < 4 hours

**P3 - Low**
- Cosmetic issue
- Enhancement request
- Response time: < 24 hours

### Incident Response Procedure

1. **Detection**
   - Monitor alerts
   - User reports
   - Automated checks

2. **Assessment**
   - Determine severity
   - Identify affected systems
   - Estimate impact

3. **Response**
   - Notify team
   - Start incident log
   - Begin investigation

4. **Mitigation**
   - Apply temporary fix
   - Rollback if necessary
   - Communicate status

5. **Resolution**
   - Apply permanent fix
   - Verify fix
   - Update documentation

6. **Post-Mortem**
   - Document incident
   - Identify root cause
   - Implement preventive measures

### Emergency Contacts

- **On-Call Engineer**: [Phone/Email]
- **DevOps Lead**: [Phone/Email]
- **Security Team**: [Phone/Email]
- **CTO**: [Phone/Email]

---

## Troubleshooting

### Common Issues

#### Application Won't Start

**Symptoms**: Application fails to start, crashes immediately

**Possible Causes**:
- Missing environment variables
- Database connection failure
- Redis connection failure
- Port already in use

**Solutions**:
```bash
# Check environment variables
env | grep -E "(SUPABASE|REDIS|ENCRYPTION)"

# Test database connection
psql -h your-db-host -U your-user -d your-database -c "SELECT 1"

# Test Redis connection
redis-cli -h your-redis-host ping

# Check port availability
lsof -i :3000
```

#### High Error Rate

**Symptoms**: Error rate > 5%, many 500 errors

**Possible Causes**:
- Database connection pool exhausted
- Redis connection issues
- External API failures
- Memory leak

**Solutions**:
```bash
# Check database connections
SELECT count(*) FROM pg_stat_activity;

# Check Redis connections
redis-cli info clients

# Check memory usage
free -h

# Check logs
tail -f /var/log/whatsapp-crm/error.log
```

#### Slow Response Times

**Symptoms**: Response time > 1000ms (p95)

**Possible Causes**:
- Slow database queries
- Cache misses
- High CPU usage
- Network latency

**Solutions**:
```bash
# Check slow queries
SELECT query, mean_exec_time 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

# Check cache hit rate
redis-cli info stats | grep hit_rate

# Check CPU usage
top -bn1 | grep "Cpu(s)"

# Enable query logging
SET log_min_duration_statement = 100;
```

#### Authentication Failures

**Symptoms**: Users cannot log in, 401 errors

**Possible Causes**:
- Supabase connection issues
- Session management issues
- CORS configuration
- Invalid credentials

**Solutions**:
```bash
# Check Supabase status
curl https://your-project.supabase.co/rest/v1/

# Check session storage
redis-cli keys "session:*"

# Check CORS headers
curl -I -X OPTIONS https://api.yourcompany.com/api/auth/login

# Check audit logs
SELECT * FROM audit_logs 
WHERE action = 'login' 
ORDER BY created_at DESC 
LIMIT 10;
```

#### Rate Limiting Issues

**Symptoms**: Legitimate users getting 429 errors

**Possible Causes**:
- Rate limits too strict
- Redis connection issues
- Incorrect tenant identification

**Solutions**:
```bash
# Check rate limit counters
redis-cli keys "ratelimit:*"

# Check rate limit configuration
cat .env.production | grep RATE_LIMIT

# Reset rate limit for specific tenant
redis-cli del "ratelimit:tenant:TENANT_ID"

# Check rate limit logs
SELECT * FROM security_events 
WHERE event_type = 'rate_limit' 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## Maintenance Windows

### Scheduled Maintenance

- **Frequency**: Monthly
- **Duration**: 2 hours
- **Time**: Sunday 2:00 AM - 4:00 AM UTC
- **Notification**: 7 days advance notice

### Maintenance Tasks

- [ ] Database optimization (VACUUM, ANALYZE)
- [ ] Index maintenance
- [ ] Log rotation
- [ ] Backup verification
- [ ] Security updates
- [ ] Dependency updates
- [ ] Performance tuning

---

## Backup and Recovery

### Backup Schedule

- **Database**: Daily at 2:00 AM UTC
- **Files**: Daily at 3:00 AM UTC
- **Configuration**: On every change
- **Retention**: 30 days

### Backup Verification

```bash
# Test database restore
pg_restore -d test_database backup_latest.sql

# Verify backup integrity
md5sum backup_latest.sql
```

### Recovery Procedures

1. **Database Recovery**
```bash
# Stop application
pm2 stop whatsapp-crm

# Restore database
psql -h your-db-host -U your-user -d your-database < backup_YYYYMMDD.sql

# Restart application
pm2 start whatsapp-crm
```

2. **File Recovery**
```bash
# Restore files from backup
aws s3 sync s3://your-backup-bucket/files/ /var/www/whatsapp-crm/uploads/
```

---

## Security Procedures

### Security Incident Response

1. **Immediate Actions**
   - Isolate affected systems
   - Block malicious IPs
   - Revoke compromised credentials
   - Enable additional logging

2. **Investigation**
   - Review audit logs
   - Check security events
   - Analyze intrusion detection alerts
   - Identify attack vector

3. **Remediation**
   - Patch vulnerabilities
   - Update security rules
   - Rotate credentials
   - Update documentation

4. **Communication**
   - Notify affected users
   - Report to authorities (if required)
   - Update security team
   - Document lessons learned

### Security Checklist

- [ ] All dependencies up to date
- [ ] No critical vulnerabilities
- [ ] SSL certificates valid
- [ ] Firewall rules configured
- [ ] Intrusion detection active
- [ ] Audit logging enabled
- [ ] Backup encryption enabled
- [ ] Access controls reviewed

---

## Appendix

### Useful Commands

```bash
# Check application status
pm2 status

# View logs
pm2 logs whatsapp-crm

# Restart application
pm2 restart whatsapp-crm

# Check database connections
psql -h your-db-host -U your-user -d your-database -c "SELECT count(*) FROM pg_stat_activity"

# Check Redis status
redis-cli ping

# Run health check
curl https://api.yourcompany.com/api/health

# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top -bn1 | head -20
```

### Configuration Files

- `.env.production` - Production environment variables
- `middleware.ts` - CORS and security configuration
- `vitest.config.ts` - Test configuration
- `next.config.js` - Next.js configuration
- `k8s/deployment.yaml` - Kubernetes deployment
- `docker-compose.yml` - Docker Compose configuration

---

**Document Version**: 1.0  
**Last Updated**: March 8, 2026  
**Next Review**: April 8, 2026
