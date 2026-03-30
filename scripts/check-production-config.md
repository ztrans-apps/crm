# Checklist Konfigurasi Production WhatsApp Webhook

## ✅ Yang Sudah Benar:
1. Webhook URL terkonfigurasi: `https://voxentra-crm.com/api/whatsapp/webhook`
2. Webhook verification berfungsi (test berhasil)
3. Webhook sudah di-subscribe ✅
4. Phone Number ID: `1019383614596994`
5. Business Account ID: `1605051657497017`
6. Nomor WhatsApp: `+62 819-9403-6462` (6281994036462)

## 🔴 Yang Perlu Diperbaiki di Vercel:

Pastikan environment variables berikut ada di **Vercel Dashboard → Settings → Environment Variables**:

### Required Variables:
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

## 📝 Cara Test:

1. **Kirim pesan ke nomor WhatsApp Business Anda**: `+62 819-9403-6462`
2. **Cek Vercel Logs**: https://vercel.com/your-project/logs
3. **Cek database Supabase**: Tabel `messages` dan `conversations`

## 🔍 Debug Steps:

Jika masih tidak menerima pesan:

1. **Cek Vercel Logs** untuk melihat apakah webhook menerima request
2. **Cek Meta Webhook Logs**: Meta for Developers → Your App → WhatsApp → Webhooks → View Logs
3. **Test webhook manual**: `node scripts/test-webhook-receive.js`
4. **Verifikasi subscription**: Webhook sudah ter-subscribe ✅

## ⚠️ Catatan Penting:

- Nomor yang harus dihubungi: `+62 819-9403-6462` (6281994036462)
- Webhook sudah di-subscribe dengan sukses
- Pastikan setelah update env vars di Vercel, lakukan redeploy atau tunggu deployment berikutnya
- Environment variables di local (.env.local) sudah diupdate dengan benar
