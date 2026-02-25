# Cara Menambahkan Test Recipient

## 🎯 Problem
Anda mendapat error: `(#131030) Recipient phone number not in allowed list`

## ✅ Solution

### Option 1: Tambah Test Recipient (Quick - 5 menit)

1. **Buka Meta Dashboard**
   ```
   https://developers.facebook.com/apps/YOUR_APP_ID/whatsapp-business/wa-dev-console/
   ```

2. **Go to API Setup**
   - Click "WhatsApp" di sidebar
   - Click "API Setup"

3. **Manage Phone Number List**
   - Scroll ke "Step 1: Select phone numbers"
   - Click "Manage phone number list"
   - Click "Add phone number"

4. **Add Your Number**
   - Enter: `+62 821 6544 3164`
   - Click "Send code"
   - Check WhatsApp di nomor tersebut
   - Enter OTP code
   - Click "Verify"

5. **Test Again**
   ```bash
   ./scripts/test-whatsapp-api.sh
   ```

### Option 2: Request Production Access (Recommended - 1-3 hari)

**Keuntungan:**
- ✅ Bisa kirim ke nomor manapun
- ✅ Tidak perlu whitelist
- ✅ Ready untuk production
- ✅ Unlimited recipients

**Steps:**

1. **Prepare Business Information**
   - Business name
   - Business website
   - Business address
   - Business description

2. **Request Access**
   ```
   Meta Dashboard > WhatsApp > API Setup
   → Click "Request Production Access"
   → Fill form
   → Submit
   ```

3. **Wait for Approval**
   - Usually 1-3 days
   - Check email for updates

4. **After Approved**
   - Update phone number to production number
   - Test with any number
   - Go live!

## 🔍 Verify Current Status

Check your current mode:

```bash
curl -X GET \
  "https://graph.facebook.com/v22.0/999729856555092" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Response:
```json
{
  "verified_name": "Your Business Name",
  "display_phone_number": "+1 555 182 0640",  // Test number
  "quality_rating": "GREEN",
  "platform_type": "CLOUD_API",
  "throughput": {
    "level": "STANDARD"  // or "HIGH" for production
  }
}
```

## 📱 Test Recipients List

Current test recipients you can use:
- `+62 821 6544 3164` (if verified)

To add more:
1. Go to Meta Dashboard
2. WhatsApp > API Setup
3. Manage phone number list
4. Add and verify each number

## ⚠️ Important Notes

### Development Mode Limitations:
- ❌ Can only send to verified test numbers
- ❌ Limited to 5 test recipients
- ❌ 90 days expiry for test numbers
- ✅ Free (no charges)

### Production Mode Benefits:
- ✅ Send to any number
- ✅ Unlimited recipients
- ✅ No expiry
- 💰 Charges apply (but free tier available)

## 🚀 Recommended Path

For production app:

1. **Week 1**: Test dengan test recipients
2. **Week 1**: Request production access
3. **Week 2**: Wait for approval
4. **Week 2**: Test in production mode
5. **Week 3**: Go live!

## 💡 Quick Fix for Now

Jika mau test sekarang:

```bash
# 1. Add test recipient di Meta Dashboard
# 2. Verify dengan OTP
# 3. Run test script
./scripts/test-whatsapp-api.sh

# 4. Check WhatsApp di nomor test Anda
# 5. Anda akan terima "Hello World" message
```

## 📞 Support

Jika masih error:
1. Check access token masih valid
2. Check phone number ID benar
3. Check nomor sudah diverify
4. Check Meta Dashboard untuk error details

---

**Next Step:** Request Production Access untuk production deployment!
