# Vercel Deployment - Quick Start Guide
## Deploy WhatsApp CRM ke Production dalam 10 Menit

**Status**: ✅ Ready to Deploy  
**Platform**: Vercel  
**Estimated Time**: 10 minutes

---

## Prerequisites

- [x] Akun Vercel (gratis di https://vercel.com)
- [x] Repository GitHub dengan kode ini
- [x] Akun Supabase (gratis di https://supabase.com)
- [x] Akun Upstash Redis (gratis di https://upstash.com)
- [x] WhatsApp Business API credentials

---

## Step 1: Generate Secure Keys (2 menit)

```bash
# Generate encryption master key
openssl rand -base64 32

# Generate webhook verify token
openssl rand -hex 32

# Simpan keys ini untuk Step 3
```

---

## Step 2: Deploy ke Vercel (3 menit)

### Option A: Via Vercel Dashboard (Recommended)

1. **Import Project**
   - Go to https://vercel.com/new
   - Click "Import Git Repository"
   - Select your GitHub repository
   - Click "Import"

2. **Configure Project**
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: `./`
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)

3. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build to complete
   - ⚠️ Deployment akan error karena belum ada environment variables
   - Ini normal! Lanjut ke Step 3

### Option B: Via CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Follow prompts, deployment akan error (normal)
```

---

## Step 3: Configure Environment Variables (5 menit)

### Via Vercel Dashboard

1. Go to your project di Vercel Dashboard
2. Click **Settings** → **Environment Variables**
3. Add semua variables berikut:

#### Supabase (Required)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

#### Encryption (Required)
```
ENCRYPTION_MASTER_KEY=your-generated-key-from-step-1
ENCRYPTION_KEY_ROTATION_DAYS=90
```

#### Redis - Upstash (Required)
```
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token-here
```

#### WhatsApp Business API (Required)
```
META_WHATSAPP_TOKEN=your-whatsapp-token
META_WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
META_WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-account-id
META_WEBHOOK_VERIFY_TOKEN=your-generated-token-from-step-1
```

#### Application Config (Required)
```
NEXT_PUBLIC_API_URL=https://your-app.vercel.app
NODE_ENV=production
DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000001
NEXT_PUBLIC_DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000001
```

#### Rate Limiting (Optional - Recommended)
```
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_SECONDS=3600
RATE_LIMIT_MAX_REQUESTS=1000
```

#### Session Management (Optional - Recommended)
```
SESSION_INACTIVITY_TIMEOUT=1800
SESSION_ABSOLUTE_TIMEOUT=86400
SESSION_MAX_CONCURRENT=5
```

#### Monitoring (Optional)
```
SENTRY_DSN=your-sentry-dsn
NEXT_PUBLIC_SENTRY_DSN=your-public-sentry-dsn
```

4. **Set Environment** untuk setiap variable:
   - Production: ✅ (Required)
   - Preview: ✅ (Optional)
   - Development: ⬜ (Optional)

5. Click **Save** untuk setiap variable

---

## Step 4: Redeploy (1 menit)

### Via Dashboard
1. Go to **Deployments** tab
2. Click **⋯** pada deployment terakhir
3. Click **Redeploy**
4. Wait 2-3 minutes

### Via CLI
```bash
vercel --prod
```

---

## Step 5: Verify Deployment (2 menit)

### Automated Checks

```bash
# Get your deployment URL
DEPLOYMENT_URL="https://your-app.vercel.app"

# Check health endpoint
curl $DEPLOYMENT_URL/api/health

# Expected response:
# {"status":"healthy","timestamp":"2026-03-08T..."}

# Check readiness
curl $DEPLOYMENT_URL/api/health/ready

# Check liveness
curl $DEPLOYMENT_URL/api/health/live
```

### Manual Checks

1. **Open Application**
   - Go to https://your-app.vercel.app
   - Homepage should load

2. **Test Login**
   - Go to /login
   - Login dengan credentials Supabase
   - Should redirect to dashboard

3. **Test Core Features**
   - Create a contact
   - Send a message
   - View conversations

4. **Check Security Headers**
   ```bash
   curl -I https://your-app.vercel.app | grep -E "(X-Content-Type|X-Frame|Strict-Transport)"
   ```

---

## Troubleshooting

### Build Fails

**Error**: "Module not found" atau "Type error"

**Solution**:
```bash
# Test build locally
npm install
npm run build

# Fix any errors, commit, push
git add .
git commit -m "Fix build errors"
git push origin main
```

### Environment Variables Not Working

**Error**: Application errors, missing configuration

**Solution**:
1. Verify all variables are set in Vercel Dashboard
2. Check variable names (case-sensitive)
3. Redeploy after adding variables
4. Check logs: `vercel logs`

### Database Connection Error

**Error**: "Could not connect to database"

**Solution**:
1. Verify Supabase URL and keys
2. Check Supabase project is active
3. Run migrations:
   ```bash
   npx supabase db push
   ```

### Redis Connection Error

**Error**: "Redis connection failed"

**Solution**:
1. Verify Upstash Redis URL and token
2. Check Redis instance is active
3. Test connection:
   ```bash
   curl https://your-redis.upstash.io/ping \
     -H "Authorization: Bearer your-token"
   ```

### 404 on API Routes

**Error**: API routes return 404

**Solution**:
1. Check `vercel.json` exists
2. Verify rewrites configuration
3. Redeploy

---

## Post-Deployment Checklist

### Immediate (Day 1)
- [ ] All health checks passing
- [ ] Login/logout works
- [ ] Core features functional
- [ ] No errors in Vercel logs
- [ ] Security headers present
- [ ] Rate limiting active

### Week 1
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Review audit logs
- [ ] Gather user feedback
- [ ] Optimize if needed

### Month 1
- [ ] Security audit
- [ ] Performance optimization
- [ ] Update dependencies
- [ ] Review and rotate secrets

---

## Quick Commands Reference

```bash
# View logs
vercel logs --follow

# List deployments
vercel ls

# Rollback to previous
vercel rollback

# Check environment variables
vercel env ls

# Pull env vars locally
vercel env pull .env.local

# Inspect deployment
vercel inspect

# Remove old deployment
vercel remove [deployment-url]
```

---

## Getting Help

### Documentation
- **Vercel Guide**: `docs/VERCEL_DEPLOYMENT_GUIDE.md`
- **Deployment Runbook**: `docs/DEPLOYMENT_RUNBOOK.md`
- **Completion Summary**: `.kiro/specs/security-optimization/COMPLETION_SUMMARY.md`

### Support
- **Vercel Docs**: https://vercel.com/docs
- **Vercel Support**: https://vercel.com/support
- **Project Issues**: [Your GitHub Issues URL]

---

## Success! 🎉

Your WhatsApp CRM is now live on Vercel!

**Next Steps**:
1. Share URL with team
2. Set up monitoring alerts
3. Configure custom domain (optional)
4. Enable Vercel Analytics
5. Set up CI/CD pipeline

**Your Deployment URL**: https://your-app.vercel.app

---

**Estimated Total Time**: 10 minutes  
**Difficulty**: Easy  
**Cost**: Free (Hobby plan) or $20/month (Pro plan)
