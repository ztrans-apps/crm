# ✅ Deployment Checklist

Quick checklist untuk deploy ke Vercel.

## 📝 Pre-Deployment

### 1. Code Ready
- [ ] All tests passing: `npm test`
- [ ] Build successful locally: `npm run build`
- [ ] No TypeScript errors: `npm run lint`
- [ ] All changes committed
- [ ] Pushed to GitHub

### 2. Environment Variables Ready
- [ ] Supabase URL & Keys
- [ ] WhatsApp API credentials
- [ ] Webhook verify token generated
- [ ] Redis URL (if using BullMQ)

### 3. External Services
- [ ] Supabase project active
- [ ] WhatsApp Business Account setup
- [ ] Redis instance ready (optional)

## 🚀 Deployment Steps

### 1. Vercel Setup (5 minutes)
- [ ] Login to https://vercel.com
- [ ] Click "Add New Project"
- [ ] Import GitHub repository
- [ ] Select `crm-repo`

### 2. Configure Project (2 minutes)
- [ ] Framework: Next.js (auto-detected)
- [ ] Root Directory: `./`
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `.next`

### 3. Environment Variables (5 minutes)
Copy dari `.env.production.example`:

**Required:**
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `WHATSAPP_API_TOKEN`
- [ ] `WHATSAPP_PHONE_NUMBER_ID`
- [ ] `WHATSAPP_BUSINESS_ACCOUNT_ID`
- [ ] `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- [ ] `NEXT_PUBLIC_APP_URL`

**Optional:**
- [ ] `REDIS_URL`
- [ ] `UPSTASH_REDIS_REST_URL`
- [ ] `UPSTASH_REDIS_REST_TOKEN`
- [ ] `SENTRY_DSN`

### 4. Deploy (3 minutes)
- [ ] Click "Deploy"
- [ ] Wait for build
- [ ] Get deployment URL
- [ ] Save URL: `https://_____.vercel.app`

## ✅ Post-Deployment

### 1. Verify Deployment (5 minutes)
- [ ] Open deployment URL
- [ ] Check homepage loads
- [ ] Check login works
- [ ] Check dashboard loads

### 2. Configure WhatsApp Webhook (5 minutes)
- [ ] Go to Meta Dashboard
- [ ] WhatsApp → Configuration
- [ ] Edit Webhook
- [ ] Callback URL: `https://your-app.vercel.app/api/whatsapp/webhook`
- [ ] Verify Token: (from env var)
- [ ] Subscribe: messages, message_status
- [ ] Click "Verify and Save"
- [ ] Webhook verified ✅

### 3. Test WhatsApp Integration (10 minutes)
- [ ] Request Production Access (if not done)
- [ ] Test send message
- [ ] Test receive message
- [ ] Check webhook logs in Vercel
- [ ] Verify messages in database

### 4. Monitor (Ongoing)
- [ ] Check Vercel logs
- [ ] Check Supabase logs
- [ ] Monitor error rates
- [ ] Check performance metrics

## 🔧 Troubleshooting

### Build Failed
```bash
# Test locally first
npm install
npm run build

# Check for errors
npm run lint
```

### Webhook Not Working
1. Check URL is correct
2. Check verify token matches
3. Check endpoint returns 200
4. Check Vercel logs for errors

### Database Connection Failed
1. Check Supabase credentials
2. Check Supabase project is active
3. Check network policies

### Environment Variables Not Loading
1. Check variable names (case-sensitive)
2. Redeploy after adding variables
3. Check in Vercel dashboard

## 📊 Success Metrics

After deployment, verify:
- [ ] Uptime: 99.9%+
- [ ] Response time: < 500ms
- [ ] Error rate: < 1%
- [ ] Build time: < 5 minutes

## 🎉 Done!

Jika semua checklist ✅, deployment berhasil!

**Next Steps:**
1. Setup custom domain (optional)
2. Enable analytics
3. Setup monitoring alerts
4. Invite team members
5. Start onboarding users

---

**Deployment URL:** `https://_____.vercel.app`

**Deployed at:** `____-__-__ __:__`

**Deployed by:** `_______`
