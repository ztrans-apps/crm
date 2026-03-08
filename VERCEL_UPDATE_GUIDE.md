# Vercel Update Guide - Security Optimization Deployment
## Updating Existing Vercel Project

**Status**: Project sudah ada di Vercel  
**Action**: Update deployment dengan security optimization  
**Duration**: ~15 menit

---

## Quick Update Steps

### 1. Verify Environment Variables (5 menit)

Pastikan semua environment variables sudah dikonfigurasi di Vercel Dashboard:

```bash
# Go to: https://vercel.com/[your-team]/[your-project]/settings/environment-variables
```

**Required Variables** (check if already set):

```env
# Database (should already exist)
✓ NEXT_PUBLIC_SUPABASE_URL
✓ SUPABASE_SERVICE_ROLE_KEY

# Redis - NEW (might need to add)
⚠️ UPSTASH_REDIS_REST_URL
⚠️ UPSTASH_REDIS_REST_TOKEN

# Encryption - NEW (must add)
⚠️ ENCRYPTION_MASTER_KEY
⚠️ ENCRYPTION_KEY_ROTATION_DAYS=90

# WhatsApp (should already exist)
✓ META_WHATSAPP_TOKEN
✓ META_WHATSAPP_PHONE_NUMBER_ID
✓ META_WHATSAPP_BUSINESS_ACCOUNT_ID
✓ META_WEBHOOK_VERIFY_TOKEN

# Tenant (should already exist)
✓ DEFAULT_TENANT_ID
✓ NEXT_PUBLIC_DEFAULT_TENANT_ID

# Monitoring (optional, might already exist)
○ SENTRY_DSN
○ SENTRY_AUTH_TOKEN
```

### 2. Add Missing Environment Variables

**A. Redis (Upstash) - REQUIRED**

1. Go to [upstash.com](https://upstash.com)
2. Create free Redis database
3. Copy REST URL and Token
4. Add to Vercel:
   ```
   UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-token-here
   ```

**B. Encryption Master Key - REQUIRED**

Generate a secure 32-character key:

```bash
# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add to Vercel:
```
ENCRYPTION_MASTER_KEY=your-generated-key-here
ENCRYPTION_KEY_ROTATION_DAYS=90
```

### 3. Run Database Migrations (2 menit)

**Option A: Using Supabase Dashboard**

1. Go to Supabase Dashboard → SQL Editor
2. Run migrations from `supabase/migrations/` folder
3. Verify tables created:
   - `audit_logs`
   - `security_events`
   - `blocked_entities`
   - `api_keys`
   - `file_uploads`

**Option B: Using Supabase CLI**

```bash
# If you have Supabase CLI installed
supabase db push
```

### 4. Push Code to Git (1 menit)

```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "feat: security optimization implementation

- Implemented all 29 phases of security optimization
- Added comprehensive security controls
- Enhanced authentication and authorization
- Added rate limiting with Redis
- Implemented encryption service
- Added intrusion detection system
- Created audit logging
- Added GDPR compliance features
- Optimized performance with caching
- Created comprehensive documentation

Ready for production deployment"

# Push to main branch (or your production branch)
git push origin main
```

### 5. Vercel Auto-Deploy (5 menit)

Vercel akan otomatis:
1. Detect push ke repository
2. Start build process
3. Run `npm run build`
4. Deploy to production

**Monitor deployment**:
- Go to: https://vercel.com/[your-team]/[your-project]
- Watch deployment logs
- Wait for "Ready" status

### 6. Verify Deployment (2 menit)

**A. Check Health Endpoints**

```bash
# Replace with your Vercel domain
curl https://your-app.vercel.app/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2026-03-08T...",
  "components": {
    "database": "up",
    "redis": "up",
    "storage": "up"
  }
}
```

**B. Test Authentication**

1. Open your app: `https://your-app.vercel.app`
2. Try to login
3. Verify session is created
4. Check that protected routes work

**C. Check Rate Limiting**

```bash
# Make multiple rapid requests
for i in {1..10}; do
  curl -I https://your-app.vercel.app/api/contacts
done

# Should see rate limit headers:
# X-RateLimit-Limit: 1000
# X-RateLimit-Remaining: 990
# X-RateLimit-Reset: 1234567890
```

**D. Verify Security Headers**

```bash
curl -I https://your-app.vercel.app

# Should see:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Strict-Transport-Security: max-age=31536000
# Content-Security-Policy: ...
```

---

## Troubleshooting

### Issue: Build Fails

**Check build logs in Vercel dashboard**

Common issues:
1. Missing environment variables
2. TypeScript errors
3. Missing dependencies

**Solution**:
```bash
# Test build locally first
npm run build

# Fix any errors, then push again
```

### Issue: Redis Connection Fails

**Symptoms**: Rate limiting not working, session errors

**Solution**:
1. Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set
2. Check Upstash dashboard - database should be active
3. System has graceful degradation - will work without Redis but with reduced functionality

### Issue: Database Migrations Not Applied

**Symptoms**: Table not found errors

**Solution**:
1. Go to Supabase Dashboard
2. SQL Editor → New Query
3. Copy content from `supabase/migrations/*.sql`
4. Run each migration manually

### Issue: Encryption Errors

**Symptoms**: "Encryption key not configured" errors

**Solution**:
1. Verify `ENCRYPTION_MASTER_KEY` is set in Vercel
2. Must be exactly 64 hex characters (32 bytes)
3. Redeploy after adding the variable

---

## Post-Deployment Checklist

### ✅ Immediate Checks (First 10 minutes)

- [ ] Health endpoint returns 200 OK
- [ ] Can login successfully
- [ ] Protected routes require authentication
- [ ] Rate limiting headers present
- [ ] Security headers present
- [ ] No errors in Vercel logs

### ✅ First Hour Monitoring

- [ ] Monitor error rate (should be < 1%)
- [ ] Check response times (p95 < 500ms)
- [ ] Verify audit logs are being created
- [ ] Check Redis connection is stable
- [ ] Monitor memory usage

### ✅ First Day Monitoring

- [ ] Review audit logs for any issues
- [ ] Check for any security events
- [ ] Monitor rate limit violations
- [ ] Review performance metrics
- [ ] Check cache hit rates (should be > 70%)

---

## Rollback Procedure (If Needed)

If something goes wrong:

### Quick Rollback

1. Go to Vercel Dashboard
2. Deployments tab
3. Find previous working deployment
4. Click "..." → "Promote to Production"
5. Confirm rollback

### Or via CLI

```bash
# Install Vercel CLI if not already
npm i -g vercel

# Login
vercel login

# List deployments
vercel ls

# Rollback to specific deployment
vercel rollback [deployment-url]
```

---

## Monitoring Setup

### Vercel Analytics

Already enabled by default:
- Page views
- Performance metrics
- Error tracking

### Sentry (Optional but Recommended)

If you have Sentry configured:

1. Errors will automatically be sent to Sentry
2. Check Sentry dashboard for any issues
3. Set up alerts for critical errors

### Custom Monitoring

Check these endpoints regularly:

```bash
# Health check
curl https://your-app.vercel.app/api/health

# Performance metrics (if you add this endpoint)
curl https://your-app.vercel.app/api/admin/metrics
```

---

## What Changed in This Deployment

### New Features

1. **Enhanced Security**
   - Rate limiting on all endpoints
   - Input validation with Zod
   - SQL injection prevention
   - XSS prevention
   - CSRF protection

2. **Session Management**
   - Redis-based sessions
   - Secure session cookies
   - Automatic session cleanup
   - Concurrent session limits

3. **Encryption**
   - AES-256-GCM encryption for sensitive data
   - Tenant-specific encryption keys
   - Key rotation support

4. **Intrusion Detection**
   - Brute force detection
   - Credential stuffing detection
   - Automatic IP blocking

5. **Audit Logging**
   - All operations logged
   - Immutable audit trail
   - Export functionality

6. **Performance Optimization**
   - Redis caching
   - Query optimization
   - Connection pooling

7. **GDPR Compliance**
   - Data export
   - Data deletion
   - Consent management

### Breaking Changes

**NONE** - All changes are backward compatible!

Existing API contracts maintained, new features added without breaking existing functionality.

---

## Performance Expectations

After deployment, you should see:

| Metric | Target | How to Check |
|--------|--------|--------------|
| Response Time (p95) | < 500ms | Vercel Analytics |
| Error Rate | < 1% | Vercel Logs |
| Cache Hit Rate | > 70% | Redis dashboard |
| Uptime | > 99.9% | Vercel Status |

---

## Support & Documentation

### If You Need Help

1. **Deployment Issues**
   - Check Vercel deployment logs
   - See: `docs/VERCEL_DEPLOYMENT_GUIDE.md`

2. **Runtime Errors**
   - Check Vercel function logs
   - Check Sentry (if configured)
   - See: `docs/DEPLOYMENT_RUNBOOK.md`

3. **Performance Issues**
   - Check Vercel Analytics
   - See: `docs/PERFORMANCE_OPTIMIZATION.md`

4. **Security Questions**
   - See: `.kiro/specs/security-optimization/PRODUCTION_READINESS_REPORT.md`

### Documentation Files

All documentation is in your repository:
- `VERCEL_QUICKSTART.md` - Quick start guide
- `docs/VERCEL_DEPLOYMENT_GUIDE.md` - Comprehensive guide
- `docs/DEPLOYMENT_RUNBOOK.md` - Operations guide
- `.kiro/specs/security-optimization/FINAL_COMPLETION_SUMMARY.md` - Completion summary

---

## Summary

### What You Need to Do

1. ✅ **Add missing environment variables** (Redis + Encryption)
2. ✅ **Run database migrations** (if not already done)
3. ✅ **Push code to Git** (`git push origin main`)
4. ✅ **Wait for Vercel auto-deploy** (~5 minutes)
5. ✅ **Verify deployment** (health checks, test login)
6. ✅ **Monitor for first hour** (check logs, metrics)

### Estimated Time

- **Setup**: 5 minutes (env vars)
- **Push**: 1 minute
- **Deploy**: 5 minutes (automatic)
- **Verify**: 2 minutes
- **Total**: ~15 minutes

### Confidence Level

**HIGH** ✅ - All code tested, backward compatible, comprehensive documentation.

---

## Ready to Update?

```bash
# 1. Add environment variables in Vercel Dashboard
# 2. Then run:

git add .
git commit -m "feat: security optimization - production ready"
git push origin main

# 3. Watch deployment in Vercel Dashboard
# 4. Verify deployment works
# 5. Monitor for first hour
```

**Good luck! 🚀**

---

**Last Updated**: March 8, 2026  
**Status**: Ready for deployment  
**Risk Level**: Low (backward compatible)
