# Debug Webhook WhatsApp

## Status Saat Ini:
- ✅ Webhook URL: `https://voxentra-crm.com/api/whatsapp/webhook`
- ✅ Webhook verification: Berhasil
- ✅ Webhook subscription: Ter-subscribe
- ✅ Endpoint merespons POST request dengan `{"success":true}`
- ❌ Tidak ada request webhook yang masuk dari WhatsApp ke Vercel logs
- ❌ Tidak ada data baru di database

## Kemungkinan Masalah:

### 1. Webhook Fields Tidak Ter-Subscribe dengan Benar
Meskipun UI Meta menunjukkan "Subscribed", bisa jadi field "messages" tidak ter-subscribe.

**Solusi**: Re-subscribe webhook fields di Meta Dashboard:
1. Buka: https://developers.facebook.com/apps/1602793760984873/whatsapp-business/wa-settings/
2. Scroll ke bagian "Webhook"
3. Klik "Edit" pada webhook fields
4. Pastikan checkbox "messages" dan "message_status" ter-centang
5. Klik "Save"

### 2. Webhook Callback URL Salah atau Tidak Verified
Meskipun verification berhasil, bisa jadi Meta tidak mengirim webhook karena ada masalah.

**Solusi**: Re-verify webhook:
1. Buka: https://developers.facebook.com/apps/1602793760984873/whatsapp-business/wa-settings/
2. Di bagian "Webhook", klik "Edit"
3. Masukkan:
   - Callback URL: `https://voxentra-crm.com/api/whatsapp/webhook`
   - Verify Token: `voxentraCRM_secure_verify_9Xk21LmP`
4. Klik "Verify and Save"

### 3. Environment Variables di Vercel Belum Diupdate
Jika env vars belum diupdate, webhook handler mungkin menggunakan Business Account ID yang salah.

**Solusi**: Update env vars di Vercel:
```
WHATSAPP_PHONE_NUMBER_ID=1019383614596994
WHATSAPP_BUSINESS_ACCOUNT_ID=1605051657497017
WHATSAPP_API_TOKEN=EAAWxu4DFjykBRONG3fbbZBNW4yK2yMavXI0QZChvEAjRf3NrBibJCEjUaLR2LLpYsRRMwnhUQmZCsEOw9rsnr27izBoMZACFgIORqWeIyJYvvX6XJjEGY6AsKfFuoQs1AMkOjZAe7YlaGK76ZBEZBHHlomWZBV0iZBWTG7pxixkt3YJa14jASvql40xQ6XYGagB4ypabDWGIyZCj92h0suCIzUsyhw09Gv731l3uIHqA9eSyO5IfXxElcZCXLm8H3ROVzzUqGXEBZCyUWQDRbCFoOHMf4r1T
WHATSAPP_WEBHOOK_VERIFY_TOKEN=voxentraCRM_secure_verify_9Xk21LmP
```

Kemudian redeploy.

### 4. WhatsApp Business Account Tidak Aktif atau Restricted
Akun WhatsApp Business mungkin memiliki batasan atau tidak aktif.

**Cek**: Buka Meta Business Manager dan cek status akun.

### 5. Test dengan Meta Test Tool
Meta menyediakan tool untuk test webhook.

**Cara**:
1. Buka: https://developers.facebook.com/apps/1602793760984873/whatsapp-business/wa-dev-console/
2. Pilih phone number: +62 819-9403-6462
3. Kirim test message
4. Cek apakah webhook menerima request

## Langkah Debug Selanjutnya:

1. **Cek Meta Webhook Logs**:
   - Buka: https://developers.facebook.com/apps/1602793760984873/webhooks/
   - Lihat "Recent Deliveries" atau "Failed Deliveries"
   - Ini akan menunjukkan apakah Meta mencoba mengirim webhook dan apa error-nya

2. **Test Manual dari Meta Console**:
   - Gunakan Meta's Test Console untuk kirim test message
   - Lihat apakah webhook dipanggil

3. **Tambahkan Logging di Webhook Handler**:
   - Tambahkan console.log di awal webhook handler
   - Deploy dan test lagi
   - Cek Vercel logs untuk melihat apakah handler dipanggil

4. **Cek Supabase Connection**:
   - Pastikan Supabase credentials di Vercel benar
   - Test koneksi Supabase dari production
