# WhatsApp Webhook Setup - Summary & Next Steps

## ✅ Yang Sudah Dilakukan:

1. **Webhook Configuration**:
   - URL: `https://voxentra-crm.com/api/whatsapp/webhook`
   - Verify Token: `voxentraCRM_secure_verify_9Xk21LmP`
   - Verification: ✅ Berhasil

2. **Webhook Subscription**:
   - Business Account ID: `1605051657497017`
   - Phone Number ID: `1019383614596994`
   - Display Number: `+62 819-9403-6462`
   - Status: ✅ Ter-subscribe via API

3. **Environment Variables Updated**:
   - `.env.local` sudah diupdate dengan credentials yang benar
   - Webhook handler sudah ditambahkan logging detail

4. **Code Changes**:
   - Webhook handler sekarang memiliki logging yang sangat detail
   - Setiap step akan di-log untuk debugging

## 🔴 YANG HARUS ANDA LAKUKAN SEKARANG:

### 1. Update Environment Variables di Vercel (CRITICAL!)

Buka **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

Tambahkan/Update variables berikut untuk **Production**:

```
WHATSAPP_API_TOKEN=EAAWxu4DFjykBRONG3fbbZBNW4yK2yMavXI0QZChvEAjRf3NrBibJCEjUaLR2LLpYsRRMwnhUQmZCsEOw9rsnr27izBoMZACFgIORqWeIyJYvvX6XJjEGY6AsKfFuoQs1AMkOjZAe7YlaGK76ZBEZBHHlomWZBV0iZBWTG7pxixkt3YJa14jASvql40xQ6XYGagB4ypabDWGIyZCj92h0suCIzUsyhw09Gv731l3uIHqA9eSyO5IfXxElcZCXLm8H3ROVzzUqGXEBZCyUWQDRbCFoOHMf4r1T

WHATSAPP_WEBHOOK_VERIFY_TOKEN=voxentraCRM_secure_verify_9Xk21LmP

WHATSAPP_PHONE_NUMBER_ID=1019383614596994

WHATSAPP_BUSINESS_ACCOUNT_ID=1605051657497017

WHATSAPP_APP_ID=1602793760984873

WHATSAPP_APP_SECRET=1842cc9c3d92e5caceac31f45d83eee6

WHATSAPP_API_VERSION=v22.0

WHATSAPP_API_URL=https://graph.facebook.com/v22.0
```

**PENTING**: Pastikan juga Supabase credentials sudah ada:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 2. Deploy/Redeploy Aplikasi

Setelah update env vars, push code changes dan deploy:

```bash
git add .
git commit -m "Add detailed webhook logging and fix configuration"
git push
```

Atau trigger manual redeploy di Vercel Dashboard.

### 3. Re-verify Webhook di Meta Dashboard

Meskipun sudah ter-subscribe, lakukan re-verification:

1. Buka: https://developers.facebook.com/apps/1602793760984873/whatsapp-business/wa-settings/
2. Scroll ke "Webhook" section
3. Klik "Edit"
4. Masukkan:
   - Callback URL: `https://voxentra-crm.com/api/whatsapp/webhook`
   - Verify Token: `voxentraCRM_secure_verify_9Xk21LmP`
5. Klik "Verify and Save"
6. Pastikan checkbox "messages" dan "message_status" ter-centang
7. Klik "Save"

### 4. Test Kirim Pesan

Setelah deploy selesai:
1. Kirim pesan WhatsApp ke: **+62 819-9403-6462**
2. Cek **Vercel Logs** - sekarang akan ada log detail:
   - `[Webhook] ===== WEBHOOK RECEIVED =====`
   - `[Webhook] Body: ...`
   - `[Webhook] Processing entry: ...`
   - dll.

### 5. Cek Meta Webhook Logs

Jika masih tidak menerima pesan:
1. Buka: https://developers.facebook.com/apps/1602793760984873/webhooks/
2. Lihat "Recent Deliveries" atau "Failed Deliveries"
3. Ini akan menunjukkan apakah Meta mencoba mengirim webhook dan apa error-nya

## 🔍 Troubleshooting:

### Jika Vercel Logs Tidak Menunjukkan Request Webhook:
- Meta tidak mengirim webhook ke server Anda
- Cek Meta Webhook Logs untuk melihat error
- Pastikan webhook fields ter-subscribe dengan benar
- Coba re-verify webhook di Meta Dashboard

### Jika Vercel Logs Menunjukkan Request Tapi Tidak Ada Data di Database:
- Cek log detail untuk melihat error spesifik
- Kemungkinan masalah Supabase connection
- Cek Supabase credentials di Vercel

### Jika Webhook Verification Gagal:
- Pastikan `WHATSAPP_WEBHOOK_VERIFY_TOKEN` di Vercel sama dengan yang di Meta
- Cek Vercel logs untuk error

## 📞 Contact Info:

- WhatsApp Business Number: **+62 819-9403-6462**
- Phone Number ID: `1019383614596994`
- Business Account ID: `1605051657497017`
- App ID: `1602793760984873`

## 📝 Files Changed:

1. `.env.local` - Updated dengan credentials yang benar
2. `app/api/whatsapp/webhook/route.ts` - Added detailed logging
3. `scripts/check-production-config.md` - Configuration checklist
4. `scripts/debug-webhook.md` - Debug guide
5. `scripts/test-webhook-post.sh` - Test script

---

**Next Action**: Update Vercel environment variables dan redeploy!
