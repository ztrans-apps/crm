# Vercel Deployment Guide
## Security-Optimized WhatsApp CRM System

**Platform**: Vercel  
**Last Updated**: March 8, 2026  
**Status**: Production Ready

---

## Table of Contents

1. [Pre-Deployment Setup](#pre-deployment-setup)
2. [Environment Variables Configuration](#environment-variables-configuration)
3. [Deployment Process](#deployment-process)
4. [Post-Deployment Verification](#post-deployment-verification)
5. [Rollback Procedures](#rollback-procedures)
6. [Monitoring and Troubleshooting](#monitoring-and-troubleshooting)

---

## Pre-Deployment Setup

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Link Project

```bash
# From your project directory
vercel link
```

### 4. Verify Build Locally

```bash
# Install dependencies
npm install

# Run tests
npm test -- --run

# Build project
npm run build

# Test production build locally
npm start
```

---

## Environment Variables Configuration

### Required Environment Variables

Tambahkan environment variables di Vercel Dashboard atau via CLI:

#### Method 1: Via Vercel Dashboard

1. Go to https://vercel.com/your-team/your-project
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

#### Method 2: Via Vercel CLI

```bash
# Production environment
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add ENCRYPTION_MASTER_KEY production
vercel env add UPSTASH_REDIS_REST_URL production
vercel env add UPSTASH_REDIS_REST_TOKEN production
vercel env add META_WHATSAPP_TOKEN production
vercel env add META_WHATSAPP_PHONE_NUMBER_ID production
vercel env add META_WHATSAPP_BUSINESS_ACCOUNT_ID production
vercel env add META_WEBHOOK_VERIFY_TOKEN production

# Preview environment (optional)
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
# ... repeat for other variables

# Development environment (optional)
vercel env add NEXT_PUBLIC_SUPABASE_URL development
# ... repeat for other variables
```

### Complete Environment Variables List

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Encryption
ENCRYPTION_MASTER_KEY=your-32-character-or-longer-master-key
ENCRYPTION_KEY_ROTATION_DAYS=90

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# WhatsApp Business API
META_WHATSAPP_TOKEN=your-whatsapp-token
META_WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
META_WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-account-id
META_WEBHOOK_VERIFY_TOKEN=your-webhook-verify-token

# Application Configuration
NEXT_PUBLIC_API_URL=https://your-app.vercel.app
NODE_ENV=production

# Tenant Configuration
DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000001
NEXT_PUBLIC_DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000001

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_SECONDS=3600
RATE_LIMIT_MAX_REQUESTS=1000

# Session Management
SESSION_INACTIVITY_TIMEOUT=1800
SESSION_ABSOLUTE_TIMEOUT=86400
SESSION_MAX_CONCURRENT=5

# Monitoring (Optional)
SENTRY_DSN=your-sentry-dsn
NEXT_PUBLIC_SENTRY_DSN=your-public-sentry-dsn
```

### Generate Secure Keys

```bash
# Generate encryption master key (32+ characters)
openssl rand -base64 32

# Generate webhook verify token
openssl rand -hex 32
```

---

## Deployment Process

### Option 1: Deploy via Git (Recommended)

#### 1. Connect GitHub Repository

1. Go to Vercel Dashboard
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure project settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: ./
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

#### 2. Configure Build Settings

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "outputDirectory": ".next"
}
```

#### 3. Deploy

```bash
# Push to main branch
git add .
git commit -m "Deploy to production"
git push origin main

# Vercel will automatically deploy
```

### Option 2: Deploy via CLI

#### 1. Deploy to Preview

```bash
# Deploy to preview environment
vercel

# This creates a preview deployment
# URL: https://your-app-random.vercel.app
```

#### 2. Deploy to Production

```bash
# Deploy to production
vercel --prod

# Or promote preview to production
vercel promote https://your-app-random.vercel.app
```

### Option 3: Deploy Specific Branch

```bash
# Deploy specific branch to preview
vercel --branch staging

# Deploy specific branch to production
vercel --prod --branch main
```

---

## Database Migrations

### Before Deployment

```bash
# Run migrations on Supabase
npx supabase db push

# Or use Supabase Dashboard
# Go to Database → Migrations → Run migrations
```

### Verify Migrations

```bash
# Check migration status
npx supabase db status

# Verify tables exist
npx supabase db dump --schema public
```

---

## Post-Deployment Verification

### 1. Automated Health Checks

```bash
# Get deployment URL
DEPLOYMENT_URL=$(vercel ls --prod | grep "your-app" | awk '{print $2}')

# Check health endpoint
curl https://$DEPLOYMENT_URL/api/health

# Expected response:
# {"status":"healthy","timestamp":"2026-03-08T..."}

# Check readiness
curl https://$DEPLOYMENT_URL/api/health/ready

# Check liveness
curl https://$DEPLOYMENT_URL/api/health/live
```

### 2. Manual Verification Checklist

#### Application Health
- [ ] Homepage loads correctly
- [ ] API health endpoint returns 200
- [ ] No console errors in browser
- [ ] All assets loading (CSS, JS, images)

#### Authentication
- [ ] Login page loads
- [ ] Login with valid credentials works
- [ ] Logout works
- [ ] Session persists across page reloads
- [ ] Invalid credentials rejected

#### Core Features
- [ ] Dashboard loads with data
- [ ] Create new contact works
- [ ] Send message works
- [ ] View conversations works
- [ ] Search functionality works
- [ ] Broadcast creation works

#### Security
- [ ] HTTPS enabled (automatic on Vercel)
- [ ] Security headers present
  ```bash
  curl -I https://your-app.vercel.app | grep -E "(X-Content-Type|X-Frame|Strict-Transport)"
  ```
- [ ] CORS configured correctly
- [ ] Rate limiting active
- [ ] Authentication required for protected routes

#### Performance
- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms
- [ ] No memory leaks
- [ ] Lighthouse score > 90

### 3. Run Smoke Tests

```bash
# Run smoke test suite
npm run test:smoke

# Or manual API tests
curl -X POST https://your-app.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

---

## Vercel-Specific Configuration

### vercel.json Configuration

Create `vercel.json` in project root:

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NODE_ENV": "production"
  },
  "build": {
    "env": {
      "NEXT_TELEMETRY_DISABLED": "1"
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    }
  ],
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 10
    }
  }
}
```

### Edge Functions Configuration (Optional)

For better performance, you can use Edge Functions:

```typescript
// app/api/health/route.ts
export const runtime = 'edge'

export async function GET() {
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  })
}
```

### Cron Jobs (Optional)

Configure scheduled tasks in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-sessions",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/rotate-keys",
      "schedule": "0 0 * * 0"
    }
  ]
}
```

---

## Rollback Procedures

### Method 1: Via Vercel Dashboard

1. Go to **Deployments** tab
2. Find the previous working deployment
3. Click **⋯** → **Promote to Production**
4. Confirm promotion

### Method 2: Via Vercel CLI

```bash
# List recent deployments
vercel ls

# Rollback to specific deployment
vercel rollback https://your-app-abc123.vercel.app

# Or rollback to previous deployment
vercel rollback
```

### Method 3: Via Git

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Vercel will automatically deploy the reverted version
```

### Verify Rollback

```bash
# Check deployment status
vercel inspect

# Verify health
curl https://your-app.vercel.app/api/health

# Check logs
vercel logs
```

---

## Monitoring and Troubleshooting

### Vercel Analytics

Enable Vercel Analytics in dashboard:
1. Go to **Analytics** tab
2. Enable **Web Analytics**
3. Enable **Speed Insights**

### View Logs

```bash
# View real-time logs
vercel logs --follow

# View logs for specific deployment
vercel logs https://your-app-abc123.vercel.app

# Filter logs
vercel logs --since 1h
vercel logs --until 30m
```

### Common Issues

#### 1. Build Failures

**Symptoms**: Deployment fails during build

**Solutions**:
```bash
# Check build logs
vercel logs --build

# Test build locally
npm run build

# Check for TypeScript errors
npm run type-check

# Check for linting errors
npm run lint
```

#### 2. Environment Variable Issues

**Symptoms**: Application errors, missing configuration

**Solutions**:
```bash
# List environment variables
vercel env ls

# Pull environment variables locally
vercel env pull .env.local

# Verify variables are set
vercel env ls production
```

#### 3. Function Timeout

**Symptoms**: 504 Gateway Timeout errors

**Solutions**:
```json
// Increase timeout in vercel.json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

#### 4. Memory Issues

**Symptoms**: Out of memory errors

**Solutions**:
- Optimize database queries
- Implement pagination
- Use streaming for large responses
- Upgrade to Pro plan for more memory

#### 5. Rate Limiting Issues

**Symptoms**: 429 Too Many Requests

**Solutions**:
```bash
# Check Redis connection
curl https://your-redis.upstash.io/ping

# Verify rate limit configuration
vercel env ls | grep RATE_LIMIT

# Check rate limit logs
vercel logs | grep "rate limit"
```

### Performance Optimization

#### 1. Enable Edge Caching

```typescript
// app/api/contacts/route.ts
export const revalidate = 60 // Cache for 60 seconds

export async function GET() {
  // Your code
}
```

#### 2. Use Edge Functions

```typescript
// For lightweight API routes
export const runtime = 'edge'
```

#### 3. Optimize Images

```typescript
// next.config.js
module.exports = {
  images: {
    domains: ['your-supabase-project.supabase.co'],
    formats: ['image/avif', 'image/webp'],
  },
}
```

#### 4. Enable Compression

Vercel automatically enables gzip/brotli compression.

---

## Continuous Deployment

### GitHub Integration

1. **Automatic Deployments**
   - Push to `main` → Deploy to production
   - Push to `staging` → Deploy to preview
   - Pull requests → Deploy to preview

2. **Branch Protection**
   ```bash
   # Require status checks
   - Vercel deployment must succeed
   - Tests must pass
   - Code review required
   ```

3. **Deployment Hooks**
   ```bash
   # Add webhook for notifications
   # Settings → Git → Deploy Hooks
   ```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test -- --run
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## Security Best Practices

### 1. Environment Variables

- ✅ Never commit `.env` files to Git
- ✅ Use Vercel's encrypted environment variables
- ✅ Rotate secrets regularly
- ✅ Use different keys for preview/production

### 2. Authentication

- ✅ Use Supabase Auth with RLS
- ✅ Implement session management
- ✅ Enable MFA for admin accounts
- ✅ Use secure session cookies

### 3. API Security

- ✅ Enable rate limiting
- ✅ Validate all inputs
- ✅ Sanitize outputs
- ✅ Use HTTPS only (automatic on Vercel)

### 4. Monitoring

- ✅ Enable Vercel Analytics
- ✅ Set up error tracking (Sentry)
- ✅ Monitor API usage
- ✅ Set up alerts for errors

---

## Cost Optimization

### Vercel Pricing Tiers

- **Hobby**: Free, good for development
- **Pro**: $20/month, recommended for production
- **Enterprise**: Custom pricing, for large scale

### Optimize Costs

1. **Function Execution Time**
   - Optimize database queries
   - Use caching effectively
   - Minimize external API calls

2. **Bandwidth**
   - Enable image optimization
   - Use CDN for static assets
   - Implement proper caching

3. **Build Minutes**
   - Cache dependencies
   - Optimize build process
   - Use incremental builds

---

## Maintenance

### Regular Tasks

#### Weekly
- [ ] Review error logs
- [ ] Check performance metrics
- [ ] Monitor API usage
- [ ] Review security alerts

#### Monthly
- [ ] Update dependencies
- [ ] Review and rotate secrets
- [ ] Analyze performance trends
- [ ] Review cost optimization

#### Quarterly
- [ ] Security audit
- [ ] Performance optimization
- [ ] Backup verification
- [ ] Documentation update

---

## Support and Resources

### Vercel Resources

- **Documentation**: https://vercel.com/docs
- **Status Page**: https://vercel-status.com
- **Support**: https://vercel.com/support
- **Community**: https://github.com/vercel/vercel/discussions

### Project Resources

- **Repository**: [Your GitHub URL]
- **Documentation**: `/docs` folder
- **Issue Tracker**: [Your GitHub Issues URL]
- **Team Chat**: [Your Slack/Discord]

---

## Quick Reference

### Essential Commands

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# View logs
vercel logs --follow

# List deployments
vercel ls

# Rollback
vercel rollback

# Environment variables
vercel env ls
vercel env add KEY_NAME production
vercel env pull .env.local

# Inspect deployment
vercel inspect [deployment-url]

# Remove deployment
vercel remove [deployment-url]
```

### Health Check URLs

```bash
# Production
https://your-app.vercel.app/api/health
https://your-app.vercel.app/api/health/ready
https://your-app.vercel.app/api/health/live

# Preview
https://your-app-git-branch.vercel.app/api/health
```

---

**Last Updated**: March 8, 2026  
**Next Review**: April 8, 2026  
**Maintained By**: DevOps Team
