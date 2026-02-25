# 🔍 Check Vercel Deployment

Deployment URL: https://voxentra-crm.vercel.app
Status: 404 Error

## Langkah Troubleshooting

### 1. Check Build Logs

1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Click project: `voxentra-crm`
3. Click latest deployment
4. Check "Building" tab untuk error messages

**Common build errors:**
- Missing dependencies
- TypeScript errors
- Environment variables not set
- Build timeout

### 2. Check Environment Variables

Pastikan semua required env vars sudah di-set:

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**WhatsApp (optional untuk build):**
- `WHATSAPP_API_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`

### 3. Check Deployment Status

Di Vercel dashboard, check:
- ✅ Build successful?
- ✅ Deployment ready?
- ❌ Error messages?

### 4. Common Issues

#### Issue 1: Build Failed
**Solution:**
1. Check build logs
2. Fix errors locally: `npm run build`
3. Push fix to GitHub
4. Vercel will auto-redeploy

#### Issue 2: Missing Environment Variables
**Solution:**
1. Go to Vercel → Settings → Environment Variables
2. Add all required variables
3. Redeploy: Deployments → ... → Redeploy

#### Issue 3: Wrong Build Settings
**Solution:**
1. Go to Vercel → Settings → General
2. Check:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

### 5. Quick Fix Steps

1. **Check Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Look for error messages

2. **Add Environment Variables:**
   - Settings → Environment Variables
   - Add from `.env.production.example`

3. **Redeploy:**
   - Deployments → Latest → ... → Redeploy

4. **Check Logs:**
   - Deployment → Functions
   - Look for runtime errors

### 6. Test Locally First

Before redeploying, test locally:

```bash
# Install dependencies
npm install

# Build
npm run build

# Start production server
npm start

# Test
curl http://localhost:3000
```

If local build works, issue is with Vercel configuration.

## Next Steps

1. Check Vercel dashboard for specific error
2. Share error message if need help
3. Fix issue
4. Redeploy
5. Test again

---

**Need help?** Share screenshot of Vercel build logs.
