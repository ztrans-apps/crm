# 🚀 Deployment Guide - Vercel

Panduan lengkap untuk deploy CRM WhatsApp ke Vercel.

## 📋 Prerequisites

1. **Vercel Account** - Daftar di https://vercel.com (gratis)
2. **GitHub Repository** - Push code ke GitHub
3. **Supabase Project** - Database sudah setup
4. **WhatsApp Business API** - Credentials dari Meta

## 🎯 Step-by-Step Deployment

### Step 1: Push ke GitHub

```bash
# Pastikan semua changes sudah di-commit
git status

# Push ke GitHub
git push origin main
```

### Step 2: Connect ke Vercel

1. Login ke https://vercel.com
2. Click "Add New Project"
3. Import dari GitHub repository
4. Select repository: `crm-repo`
5. Click "Import"

### Step 3: Configure Project

**Framework Preset:** Next.js (auto-detected)

**Root Directory:** `./` (default)

**Build Command:** `npm run build` (default)

**Output Directory:** `.next` (default)

**Install Command:** `npm install` (default)

### Step 4: Environment Variables

Add semua environment variables berikut di Vercel dashboard:

#### Supabase
```
NEXT_PUBLIC_SUPABASE_URL=https://lauhwtpbknlakysdmpju.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

#### WhatsApp Business API
```
WHATSAPP_API_TOKEN=your_access_token
WHATSAPP_PHONE_NUMBER_ID=999729856555092
WHATSAPP_BUSINESS_ACCOUNT_ID=906265848969233
WHATSAPP_WEBHOOK_VERIFY_TOKEN=random_secure_token_123
WHATSAPP_API_URL=https://graph.facebook.com/v22.0
```

#### App Configuration
```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

#### Vercel Cron
```
CRON_SECRET=your_random_cron_secret
```

#### Upstash Redis (untuk dashboard cache)
```
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

### Step 5: Deploy

1. Click "Deploy"
2. Wait for build to complete (2-5 minutes)
3. Get deployment URL: `https://your-app.vercel.app`

### Step 6: Configure WhatsApp Webhook

Setelah deploy berhasil:

1. Go to Meta Dashboard: https://developers.facebook.com/apps/
2. Your App → WhatsApp → Configuration
3. Edit Webhook:
   - **Callback URL:** `https://your-app.vercel.app/api/whatsapp/webhook`
   - **Verify Token:** (sama dengan `WHATSAPP_WEBHOOK_VERIFY_TOKEN`)
4. Subscribe to fields:
   - ✅ messages
   - ✅ message_status
5. Click "Verify and Save"

### Step 7: Test Deployment

```bash
# Test API endpoint
curl https://your-app.vercel.app/api/health

# Test WhatsApp webhook
curl https://your-app.vercel.app/api/whatsapp/webhook
```

## ✅ Post-Deployment Checklist

- [ ] Deployment successful
- [ ] Environment variables configured
- [ ] Database connection working
- [ ] WhatsApp webhook verified
- [ ] Test send message
- [ ] Test receive message
- [ ] Check logs for errors
- [ ] Setup custom domain (optional)

## 🔧 Troubleshooting

### Build Failed

**Error:** Module not found
```bash
# Solution: Check package.json dependencies
npm install
npm run build
```

**Error:** TypeScript errors
```bash
# Solution: Fix TypeScript errors locally first
npm run lint
```

### Environment Variables Not Working

1. Check variable names (case-sensitive)
2. Redeploy after adding variables
3. Check Vercel dashboard → Settings → Environment Variables

### Webhook Verification Failed

1. Check `WHATSAPP_WEBHOOK_VERIFY_TOKEN` matches
2. Check URL is correct: `https://your-app.vercel.app/api/whatsapp/webhook`
3. Check webhook endpoint is accessible (not 404)

### Database Connection Failed

1. Check Supabase URL and keys
2. Check Supabase project is active
3. Check network policies in Supabase dashboard

## 📊 Monitoring

### Vercel Dashboard

- **Deployments:** View deployment history
- **Analytics:** Traffic and performance
- **Logs:** Real-time function logs
- **Speed Insights:** Performance metrics

### Check Logs

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# View logs
vercel logs
```

## 🔄 Continuous Deployment

Vercel automatically deploys when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "feat: new feature"
git push origin main

# Vercel will auto-deploy
```

## 🌐 Custom Domain

1. Go to Vercel dashboard → Settings → Domains
2. Add your domain: `crm.yourdomain.com`
3. Update DNS records (Vercel will show instructions)
4. Wait for DNS propagation (5-60 minutes)
5. Update `NEXT_PUBLIC_APP_URL` environment variable

## 💰 Costs

**Hobby Plan (Free):**
- 100GB bandwidth/month
- 100k function invocations/month
- Unlimited deployments
- HTTPS included

**Pro Plan ($20/month):**
- Unlimited bandwidth
- 1M function invocations/month
- Team collaboration
- Advanced analytics

## 🚀 Performance Tips

### 1. Enable Edge Functions

For faster response times globally:

```typescript
// app/api/route.ts
export const runtime = 'edge'
```

### 2. Optimize Images

Use Next.js Image component:

```tsx
import Image from 'next/image'

<Image src="/logo.png" width={200} height={200} alt="Logo" />
```

### 3. Enable Caching

```typescript
// app/api/route.ts
export const revalidate = 3600 // Cache for 1 hour
```

### 4. Use ISR (Incremental Static Regeneration)

```typescript
// app/page.tsx
export const revalidate = 60 // Revalidate every 60 seconds
```

## 🔐 Security

### 1. Environment Variables

- Never commit `.env.local` to Git
- Use Vercel environment variables
- Rotate tokens regularly

### 2. API Routes

```typescript
// Verify requests
if (req.headers.get('authorization') !== `Bearer ${process.env.API_SECRET}`) {
  return new Response('Unauthorized', { status: 401 })
}
```

### 3. CORS

```typescript
// app/api/route.ts
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
    },
  })
}
```

## 📚 Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel CLI](https://vercel.com/docs/cli)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

## 🆘 Support

Jika ada masalah:
1. Check Vercel logs
2. Check Vercel status: https://www.vercel-status.com/
3. Vercel Discord: https://vercel.com/discord
4. GitHub Issues

---

**Ready to deploy? Let's go! 🚀**
