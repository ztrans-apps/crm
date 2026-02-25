# WhatsApp Business API - Quick Start Guide

## 🚀 Setup dalam 30 Menit

### Step 1: Daftar Meta Cloud API (5 menit)

1. **Buat Facebook App**
   ```
   https://developers.facebook.com/apps/
   → Create App
   → Business
   → Add WhatsApp Product
   ```

2. **Dapatkan Credentials**
   - Go to: WhatsApp > API Setup
   - Copy:
     - Temporary Access Token
     - Phone Number ID
     - WhatsApp Business Account ID

3. **Test dengan Test Number**
   - Add test phone number
   - Send test message dari dashboard

### Step 2: Setup Environment (5 menit)

```bash
# Copy environment template
cp .env.whatsapp-api.example .env.local

# Edit .env.local dengan credentials Anda
nano .env.local
```

Isi dengan credentials dari Step 1:
```env
WHATSAPP_API_TOKEN=EAAxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345
WHATSAPP_WEBHOOK_VERIFY_TOKEN=random_secure_token_123
```

### Step 3: Install Dependencies (2 menit)

```bash
# Install axios jika belum ada
npm install axios

# Atau yarn
yarn add axios
```

### Step 4: Test Send Message (5 menit)

Buat file test:

```typescript
// scripts/test-whatsapp.ts
import { createWhatsAppService } from '@/lib/whatsapp/services/whatsapp-service'

async function testSendMessage() {
  const service = createWhatsAppService()
  
  // Ganti dengan nomor test Anda
  const testPhone = '6281234567890'
  
  const result = await service.sendTextMessage(
    'tenant-1',
    testPhone,
    'Hello from WhatsApp Business API! 🎉'
  )
  
  console.log('Result:', result)
}

testSendMessage()
```

Run test:
```bash
npx tsx scripts/test-whatsapp.ts
```

### Step 5: Setup Webhook (10 menit)

1. **Deploy ke Server**
   ```bash
   # Deploy ke Vercel/Railway/etc
   npm run deploy
   ```

2. **Configure Webhook di Meta**
   ```
   https://developers.facebook.com/apps/
   → Your App
   → WhatsApp > Configuration
   → Edit Webhook
   ```

   Settings:
   - Callback URL: `https://yourdomain.com/api/whatsapp/webhook`
   - Verify Token: (sama dengan `WHATSAPP_WEBHOOK_VERIFY_TOKEN`)
   - Subscribe to: `messages`, `message_status`

3. **Test Webhook**
   - Send message ke WhatsApp number Anda
   - Check logs: `npm run logs`
   - Verify message masuk ke database

### Step 6: Create Message Template (5 menit)

1. **Go to Message Templates**
   ```
   https://business.facebook.com/wa/manage/message-templates/
   ```

2. **Create Template**
   - Name: `welcome_message`
   - Category: `UTILITY`
   - Language: `Indonesian`
   - Content:
     ```
     Halo {{1}},
     
     Terima kasih telah menghubungi kami!
     Tim kami akan segera membantu Anda.
     ```

3. **Wait for Approval** (biasanya < 1 jam)

4. **Test Template**
   ```typescript
   const result = await service.sendTemplateMessage(
     'tenant-1',
     '6281234567890',
     {
       name: 'welcome_message',
       language: 'id',
       components: [
         {
           type: 'body',
           parameters: [
             { type: 'text', text: 'John Doe' }
           ]
         }
       ]
     }
   )
   ```

## ✅ Verification Checklist

- [ ] Credentials configured in `.env.local`
- [ ] Test message sent successfully
- [ ] Webhook configured and verified
- [ ] Incoming messages received
- [ ] Message status updates working
- [ ] Template message created and approved
- [ ] Template message sent successfully

## 🎯 Next Steps

### 1. Integrate dengan Existing Code

Replace Baileys calls dengan WhatsApp Service:

```typescript
// Before (Baileys)
await sock.sendMessage(jid, { text: message })

// After (WhatsApp Business API)
const service = createWhatsAppService()
await service.sendTextMessage(tenantId, phone, message)
```

### 2. Update Database Schema

Add columns untuk tracking:

```sql
ALTER TABLE messages 
ADD COLUMN provider VARCHAR(50) DEFAULT 'meta',
ADD COLUMN message_id VARCHAR(255),
ADD COLUMN status VARCHAR(50) DEFAULT 'pending';

CREATE INDEX idx_messages_message_id ON messages(message_id);
CREATE INDEX idx_messages_status ON messages(status);
```

### 3. Migrate Existing Sessions

```typescript
// Script untuk migrate sessions
// scripts/migrate-sessions.ts

async function migrateSessions() {
  // 1. Export existing sessions
  // 2. Notify users tentang perubahan
  // 3. Update phone numbers
  // 4. Test dengan sample users
}
```

### 4. Setup Monitoring

```typescript
// lib/monitoring/whatsapp-monitor.ts

export async function monitorWhatsAppHealth() {
  // Check message delivery rate
  // Check webhook processing time
  // Alert if error rate > 5%
}
```

### 5. Create Admin Dashboard

Features:
- View message statistics
- Monitor delivery rates
- Manage templates
- View webhook logs
- Test message sending

## 📊 Cost Calculator

```typescript
// Estimasi biaya per bulan
const monthlyUsers = 10000
const messagesPerUser = 5
const totalConversations = monthlyUsers * messagesPerUser

// Meta Cloud API Pricing
const freeConversations = 1000
const paidConversations = totalConversations - freeConversations
const costPerConversation = 0.0084 // average

const monthlyCost = paidConversations * costPerConversation

console.log(`Estimated monthly cost: $${monthlyCost}`)
// For 10k users: ~$420/month
```

## 🆘 Troubleshooting

### Message Not Sending

1. Check credentials:
   ```bash
   echo $WHATSAPP_API_TOKEN
   echo $WHATSAPP_PHONE_NUMBER_ID
   ```

2. Test API directly:
   ```bash
   curl -X POST "https://graph.facebook.com/v18.0/$PHONE_NUMBER_ID/messages" \
     -H "Authorization: Bearer $ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "messaging_product": "whatsapp",
       "to": "6281234567890",
       "type": "text",
       "text": { "body": "Test message" }
     }'
   ```

3. Check error logs:
   ```bash
   npm run logs | grep "WhatsApp"
   ```

### Webhook Not Receiving

1. Verify webhook URL is accessible:
   ```bash
   curl https://yourdomain.com/api/whatsapp/webhook
   ```

2. Check webhook configuration in Meta dashboard

3. Test webhook locally with ngrok:
   ```bash
   ngrok http 3000
   # Use ngrok URL in Meta webhook config
   ```

### Template Not Approved

Common reasons:
- Contains promotional content (use MARKETING category)
- Missing required information
- Violates WhatsApp policies

Solution:
- Review template guidelines
- Use clear, informative content
- Avoid promotional language in UTILITY templates

## 📚 Resources

- [Meta Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Message Templates Guide](https://developers.facebook.com/docs/whatsapp/message-templates)
- [Webhook Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- [Error Codes](https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes)
- [Best Practices](https://developers.facebook.com/docs/whatsapp/business-management-api/best-practices)

## 💡 Tips

1. **Start Small**: Test dengan 10-20 users dulu
2. **Monitor Closely**: Watch logs dan metrics
3. **Have Rollback Plan**: Keep Baileys code di separate branch
4. **Gradual Migration**: Migrate 10% users per day
5. **User Communication**: Inform users tentang perubahan

## 🎉 Success!

Jika semua checklist ✅, Anda siap untuk production!

Next: Deploy dan monitor untuk 1 minggu sebelum full migration.
