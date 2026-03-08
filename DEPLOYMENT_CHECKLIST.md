# Deployment Checklist - Security Optimization Update
## For Existing Vercel Project

**Date**: March 8, 2026  
**Status**: Ready to Deploy  
**Estimated Time**: 15 minutes

---

## Pre-Deployment Checklist

### ✅ Environment Variables

Check Vercel Dashboard → Settings → Environment Variables:

**Already Set** (should exist):
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `META_WHATSAPP_TOKEN`
- [ ] `META_WHATSAPP_PHONE_NUMBER_ID`
- [ ] `META_WHATSAPP_BUSINESS_ACCOUNT_ID`
- [ ] `META_WEBHOOK_VERIFY_TOKEN`
- [ ] `DEFAULT_TENANT_ID`
- [ ] `NEXT_PUBLIC_DEFAULT_TENANT_ID`

**Need to Add** (new for security optimization):
- [ ] `UPSTASH_REDIS_REST_URL` - Get from upstash.com
- [ ] `UPSTASH_REDIS_REST_TOKEN` - Get from upstash.com
- [ ] `ENCRYPTION_MASTER_KEY` - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] `ENCRYPTION_KEY_ROTATION_DAYS=90`

**Optional** (for monitoring):
- [ ] `SENTRY_DSN` (if using Sentry)
- [ ] `SENTRY_AUTH_TOKEN` (if using Sentry)

---

## Deployment Steps

### Step 1: Setup Redis (5 minutes)

1. [ ] Go to [upstash.com](https://upstash.com)
2. [ ] Sign up / Login
3. [ ] Create new Redis database (free tier OK)
4. [ ] Copy REST URL
5. [ ] Copy REST Token
6. [ ] Add to Vercel environment variables

### Step 2: Generate Encryption Key (1 minute)

```bash
# Run this command to generate key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copy output and add to Vercel as ENCRYPTION_MASTER_KEY
```

### Step 3: Database Migrations (2 minutes)

**Option A: Supabase Dashboard**
1. [ ] Go to Supabase Dashboard
2. [ ] SQL Editor → New Query
3. [ ] Run migrations from `supabase/migrations/` folder
4. [ ] Verify tables created

**Option B: Skip if tables already exist**
- [ ] Check if `audit_logs` table exists
- [ ] Check if `security_events` table exists
- [ ] If yes, skip this step

### Step 4: Push to Git (1 minute)

```bash
# Stage all changes
git add .

# Commit
git commit -m "feat: security optimization implementation - production ready"

# Push (triggers Vercel auto-deploy)
git push origin main
```

### Step 5: Monitor Deployment (5 minutes)

1. [ ] Go to Vercel Dashboard
2. [ ] Watch deployment progress
3. [ ] Wait for "Ready" status
4. [ ] Check deployment logs for errors

### Step 6: Verify Deployment (2 minutes)

**A. Health Check**
```bash
curl https://your-app.vercel.app/api/health
# Should return: {"status":"healthy",...}
```

**B. Test Login**
1. [ ] Open your app
2. [ ] Try to login
3. [ ] Verify it works

**C. Check Security Headers**
```bash
curl -I https://your-app.vercel.app
# Should see: X-Content-Type-Options, X-Frame-Options, etc.
```

---

## Post-Deployment Monitoring

### First 10 Minutes

- [ ] No errors in Vercel logs
- [ ] Health endpoint returns 200
- [ ] Login works
- [ ] Protected routes require auth
- [ ] Security headers present

### First Hour

- [ ] Error rate < 1%
- [ ] Response time < 500ms (p95)
- [ ] No Redis connection errors
- [ ] Audit logs being created

### First Day

- [ ] Review audit logs
- [ ] Check security events
- [ ] Monitor performance metrics
- [ ] Verify cache hit rate > 70%

---

## Rollback Plan (If Needed)

If something goes wrong:

1. [ ] Go to Vercel Dashboard
2. [ ] Deployments tab
3. [ ] Find previous working deployment
4. [ ] Click "..." → "Promote to Production"
5. [ ] Confirm rollback

---

## Quick Reference

### Important URLs

- **Vercel Dashboard**: https://vercel.com/[your-team]/[your-project]
- **Upstash Dashboard**: https://console.upstash.com
- **Supabase Dashboard**: https://app.supabase.com

### Important Files

- `VERCEL_UPDATE_GUIDE.md` - Detailed update guide
- `docs/VERCEL_DEPLOYMENT_GUIDE.md` - Comprehensive deployment guide
- `docs/DEPLOYMENT_RUNBOOK.md` - Operations runbook
- `.kiro/specs/security-optimization/FINAL_COMPLETION_SUMMARY.md` - What was completed

### Support Commands

```bash
# Test build locally
npm run build

# Run tests
npm test

# Check health (after deploy)
curl https://your-app.vercel.app/api/health
```

---

## What's New in This Deployment

✅ Enhanced security (rate limiting, input validation)  
✅ Session management with Redis  
✅ Encryption service for sensitive data  
✅ Intrusion detection system  
✅ Audit logging for compliance  
✅ Performance optimization with caching  
✅ GDPR compliance features  

**All backward compatible - no breaking changes!**

---

## Status

- [x] All code complete (29/29 phases)
- [x] All tests written (1494 tests)
- [x] All documentation created (21+ docs)
- [x] Vercel configuration ready
- [ ] Environment variables added ← **DO THIS**
- [ ] Code pushed to Git ← **DO THIS**
- [ ] Deployment verified ← **DO THIS**

---

## Ready to Deploy?

**YES!** Follow the steps above. Estimated time: 15 minutes.

**Questions?** See `VERCEL_UPDATE_GUIDE.md` for detailed instructions.

**Good luck! 🚀**
