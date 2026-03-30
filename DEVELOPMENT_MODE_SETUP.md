# WhatsApp Development Mode Setup Guide

## 📱 Test Account Information

- **Test Number**: `+1 555-192-5501`
- **Phone Number ID**: `958629000677109`
- **Business Account ID**: `128310278367634` (Test WhatsApp Business Account)
- **Webhook URL**: `https://voxentra-crm.com/api/whatsapp/webhook` ✅
- **Status**: Connected ✅

## ✅ Yang Sudah Dilakukan:

1. ✅ `.env.local` updated dengan test account credentials
2. ✅ Webhook URL sudah terkonfigurasi di test number
3. ✅ Webhook handler sudah ada detailed logging

## 🔧 Setup Webhook Subscription di Meta Dashboard

Untuk development mode, webhook subscription harus dilakukan via Meta Dashboard:

### Step 1: Buka Webhook Configuration

1. Buka: https://developers.facebook.com/apps/1602793760984873/webhooks/
2. Atau: **Meta Developer Console** → Your App → **Webhooks**

### Step 2: Subscribe to WhatsApp Webhooks

1. Cari section **"WhatsApp"** di daftar webhooks
2. Klik **"Edit"** atau **"Subscribe to this object"**
3. Anda akan melihat daftar webhook fields
4. **Centang** checkbox untuk:
   - ✅ `messages` - untuk menerima pesan masuk
   - ✅ `message_status` - untuk status delivery (sent, delivered, read, failed)
5. Klik **"Save"** atau **"Subscribe"**

### Step 3: Verify Webhook (Jika Belum)

Jika diminta verify webhook:

1. **Callback URL**: `https://voxentra-crm.com/api/whatsapp/webhook`
2. **Verify Token**: `voxentraCRM_secure_verify_9Xk21LmP`
3. Klik **"Verify and Save"**

## 🧪 Testing dengan Test Number

### Cara 1: Kirim Test Message dari Meta Console

1. Buka: https://developers.facebook.com/apps/1602793760984873/whatsapp-business/wa-dev-console/
2. Pilih **"Send and receive messages"**
3. **From**: Test number: +1 555 192 5501
4. **To**: Masukkan nomor WhatsApp Anda sendiri (untuk testing)
5. Klik **"Send message"**
6. Balas pesan tersebut dari WhatsApp Anda
7. Webhook akan menerima pesan balasan Anda

### Cara 2: Kirim Message via API

Gunakan curl command dari Meta Console atau jalankan:

```bash
curl -X POST "https://graph.facebook.com/v22.0/958629000677109/messages" \
  -H "Authorization: Bearer EAAWxu4DFjykBRONG3fbbZBNW4yK2yMavXI0QZChvEAjRf3NrBibJCEjUaLR2LLpYsRRMwnhUQmZCsEOw9rsnr27izBoMZACFgIORqWeIyJYvvX6XJjEGY6AsKfFuoQs1AMkOjZAe7YlaGK76ZBEZBHHlomWZBV0iZBWTG7pxixkt3YJa14jASvql40xQ6XYGagB4ypabDWGIyZCj92h0suCIzUsyhw09Gv731l3uIHqA9eSyO5IfXxElcZCXLm8H3ROVzzUqGXEBZCyUWQDRbCFoOHMf4r1T" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "NOMOR_WHATSAPP_ANDA",
    "type": "template",
    "template": {
      "name": "hello_world",
      "language": { "code": "en_US" }
    }
  }'
```

Ganti `NOMOR_WHATSAPP_ANDA` dengan nomor WhatsApp Anda (format: 628123456789).

### Cara 3: Test Webhook Receive (Simulasi)

Jalankan script test untuk simulasi webhook:

```bash
bash scripts/test-webhook-post.sh
```

Ini akan mengirim fake webhook payload ke endpoint Anda untuk testing.

## 📊 Monitoring & Debugging

### 1. Cek Vercel Logs

Setelah kirim/terima pesan, cek logs di:
- https://vercel.com/your-project/logs

Anda akan melihat log detail seperti:
```
[Webhook] ===== WEBHOOK RECEIVED =====
[Webhook] Timestamp: 2026-03-30T...
[Webhook] Body: { ... }
[Webhook] Processing entry: 128310278367634
[Webhook] Processing change field: messages
[Webhook] Handling messages change...
```

### 2. Cek Meta Webhook Logs

Untuk melihat apakah Meta mengirim webhook:
1. Buka: https://developers.facebook.com/apps/1602793760984873/webhooks/
2. Scroll ke **"Recent Deliveries"** atau **"Webhook Logs"**
3. Lihat status: Success (200) atau Failed (dengan error message)

### 3. Cek Database Supabase

Setelah webhook diterima, cek tabel:
- `contacts` - Contact baru harus dibuat
- `conversations` - Conversation baru harus dibuat
- `messages` - Message harus tersimpan

## 🔄 Update Environment Variables di Vercel

Untuk production deployment, update di Vercel:

1. Buka: **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Update/tambahkan untuk **Production**:

```
WHATSAPP_PHONE_NUMBER_ID=958629000677109
WHATSAPP_BUSINESS_ACCOUNT_ID=128310278367634
```

3. Redeploy aplikasi

## ⚠️ Catatan Penting untuk Development Mode

1. **Test Number Limitations**:
   - Hanya bisa kirim pesan ke nomor yang sudah di-whitelist
   - Gratis untuk 90 hari pertama
   - Setelah 90 hari, perlu upgrade atau nomor akan expired

2. **Webhook Subscription**:
   - Dalam development mode, webhook subscription dilakukan di level App
   - Tidak bisa subscribe via API seperti production account
   - Harus subscribe via Meta Dashboard

3. **Testing Flow**:
   - Kirim pesan dari test number ke nomor Anda → Anda terima di WhatsApp
   - Balas pesan tersebut → Webhook menerima pesan balasan Anda
   - Atau kirim pesan ke test number dari nomor yang di-whitelist

4. **Switching ke Production**:
   - Setelah testing selesai, switch App Mode ke "Live"
   - Update env vars dengan production account credentials
   - Subscribe webhook untuk production account

## 🎯 Next Steps

1. ✅ Subscribe webhook fields di Meta Dashboard (messages, message_status)
2. ✅ Test kirim pesan dari Meta Console
3. ✅ Balas pesan tersebut dari WhatsApp Anda
4. ✅ Cek Vercel logs untuk melihat webhook diterima
5. ✅ Cek Supabase database untuk melihat data tersimpan
6. ✅ Test semua endpoint message (text, image, video, dll)
7. ✅ Setelah testing selesai, switch ke Live mode

---

**Ready to test!** Subscribe webhook fields di Meta Dashboard, lalu kirim test message.
