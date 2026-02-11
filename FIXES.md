# Bug Fixes

## Fix 1: Agent Dropdown Kosong

### Problem
Saat owner ingin assign agent, dropdown menampilkan "Tidak ada agent tersedia"

### Root Cause
Query mencari agent dengan filter `agent_status IN ('available', 'busy')`, tapi field `agent_status` mungkin null atau tidak di-set untuk semua agent.

### Solution
Menghapus filter `agent_status` dari query, sehingga semua agent dengan role='agent' akan ditampilkan.

### Files Changed
- `features/chat/components/shared/AgentAssignment.tsx`

### Changes
```typescript
// Before:
.in('agent_status', ['available', 'busy'])

// After:
// Filter removed - show all agents
```

### Testing
1. Login sebagai owner
2. Klik conversation
3. Expand "Assign Agent" section
4. Klik dropdown "Assign agent..."
5. Verify: List of agents should appear

---

## Fix 2: Error "direction column not found"

### Problem
Error saat kirim pesan: "Could not find the 'direction' column of 'messages' in the schema cache"

### Root Cause
Code menggunakan kolom `direction` yang tidak ada di database schema. Database menggunakan `is_from_me` (boolean) bukan `direction` (string).

### Solution
Replace semua penggunaan `direction` dengan `is_from_me`:
- `direction: 'outgoing'` → `is_from_me: true`
- `direction: 'incoming'` → `is_from_me: false`
- `.eq('direction', 'incoming')` → `.eq('is_from_me', false)`
- `m.direction === 'incoming'` → `!m.is_from_me`
- `m.direction === 'outgoing'` → `m.is_from_me`

### Files Changed
- `features/chat/services/message.service.ts`

### Changes

#### 1. Send Message (Insert)
```typescript
// Before:
const messageData = {
  conversation_id: params.conversationId,
  sender_id: params.userId,
  content: params.content,
  direction: 'outgoing',
  status: 'pending',
}

// After:
const messageData = {
  conversation_id: params.conversationId,
  sender_type: 'agent',
  sender_id: params.userId,
  content: params.content,
  is_from_me: true,
  status: 'pending',
}
```

#### 2. Mark as Read (Update)
```typescript
// Before:
.eq('direction', 'incoming')

// After:
.eq('is_from_me', false)
```

#### 3. Message Stats (Filter)
```typescript
// Before:
incoming: messages.filter(m => m.direction === 'incoming').length,
outgoing: messages.filter(m => m.direction === 'outgoing').length,
unread: messages.filter(m => m.direction === 'incoming' && !m.read_at).length,

// After:
incoming: messages.filter(m => !m.is_from_me).length,
outgoing: messages.filter(m => m.is_from_me).length,
unread: messages.filter(m => !m.is_from_me && !m.read_at).length,
```

### Testing
1. Login sebagai owner/agent
2. Select a conversation
3. Type a message
4. Click send
5. Verify: Message should be sent without error
6. Check database: `SELECT * FROM messages ORDER BY created_at DESC LIMIT 5;`
7. Verify: `is_from_me` should be `true` for sent messages

---

## Fix 3: Error "messages_status_check" Constraint Violation

### Problem
Error saat kirim pesan: "new row for relation 'messages' violates check constraint 'messages_status_check'"

### Root Cause
Code menggunakan status 'pending' yang tidak valid. Database constraint hanya menerima: 'sent', 'delivered', 'read', 'failed'.

### Solution
Ganti status dari 'pending' menjadi 'sent' saat save message ke database.

### Files Changed
- `features/chat/services/message.service.ts`

### Changes
```typescript
// Before:
status: 'pending',

// After:
status: 'sent',
```

### Valid Status Values
- ✅ `'sent'` - Message sent to WhatsApp
- ✅ `'delivered'` - Message delivered to recipient
- ✅ `'read'` - Message read by recipient
- ✅ `'failed'` - Message failed to send
- ❌ `'pending'` - NOT VALID (causes constraint error)

### Testing
1. Login sebagai owner/agent
2. Select a conversation
3. Type a message
4. Click send
5. Verify: Message should be sent successfully
6. Check database: `SELECT id, content, status FROM messages ORDER BY created_at DESC LIMIT 5;`
7. Verify: Status should be 'sent'

---

## Database Schema Reference

### messages table columns:
- ✅ `is_from_me` (boolean) - Use this
- ❌ `direction` (string) - Does NOT exist
- ✅ `sender_type` ('customer' | 'agent' | 'bot')
- ✅ `sender_id` (uuid, nullable)
- ✅ `content` (text)
- ✅ `status` ('sent' | 'delivered' | 'read' | 'failed')
- ✅ `read_at` (timestamp, nullable)

### Logic:
- **Incoming message** (from customer): `is_from_me = false`, `sender_type = 'customer'`
- **Outgoing message** (from agent): `is_from_me = true`, `sender_type = 'agent'`, `sender_id = agent_user_id`

---

## Verification Checklist

After applying fixes:

- [ ] Restart Next.js dev server
- [ ] Clear browser cache (Ctrl+Shift+R)
- [ ] Test assign agent dropdown (should show agents)
- [ ] Test send message (should work without error)
- [ ] Check console for errors (should be none)
- [ ] Check database messages table (should have correct data)

---

## Additional Notes

### Agent Status Field
If you want to use `agent_status` filter in the future:
1. Make sure all agents have `agent_status` set in database
2. Update agents: `UPDATE profiles SET agent_status = 'available' WHERE role = 'agent';`
3. Re-enable filter in AgentAssignment.tsx

### Database Migration
No migration needed. These are code-only fixes to match existing database schema.


---

## Fix 4: Error "error_message column not found"

### Problem
Error saat update message status: "Could not find the 'error_message' column"

### Root Cause
Code mencoba update field `error_message` yang tidak ada di database schema.

### Solution
Hapus `error_message` dari update query.

### Files Changed
- `features/chat/services/message.service.ts`

### Changes
```typescript
// Before:
await this.supabase
  .from('messages')
  .update({
    status: 'failed',
    error_message: whatsappError.message,
  })

// After:
await this.supabase
  .from('messages')
  .update({
    status: 'failed',
  })
```

---

## Fix 5: Send Message API Route

### Problem
Tidak ada API route untuk proxy request ke WhatsApp service.

### Root Cause
Frontend tidak bisa langsung call WhatsApp service karena CORS dan security.

### Solution
Buat Next.js API route `/api/send-message` sebagai proxy.

### Files Created
- `app/api/send-message/route.ts`

### Implementation
```typescript
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { sessionId, to, message } = body

  // Call WhatsApp service
  const whatsappServiceUrl = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001'
  
  const response = await fetch(`${whatsappServiceUrl}/api/whatsapp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, to, message }),
  })

  return NextResponse.json(await response.json())
}
```

---

## Fix 6: Wrong WhatsApp Service Endpoint (404 Error)

### Problem
Error: `POST http://localhost:3001/api/send-message 404 (Not Found)`

### Root Cause
1. WhatsApp service menggunakan endpoint `/api/whatsapp/send` (bukan `/send-message`)
2. Message service mencoba call WhatsApp service langsung dari browser (CORS issue)

### Solution
1. Update API route untuk call endpoint yang benar: `/api/whatsapp/send`
2. Update message service untuk menggunakan Next.js API route sebagai proxy

### Files Changed
- `app/api/send-message/route.ts` - Fixed endpoint path
- `features/chat/services/message.service.ts` - Use Next.js proxy

### Changes

#### 1. API Route (app/api/send-message/route.ts)
```typescript
// Before:
const response = await fetch(`${whatsappServiceUrl}/send-message`, {

// After:
const response = await fetch(`${whatsappServiceUrl}/api/whatsapp/send`, {
```

#### 2. Message Service (features/chat/services/message.service.ts)
```typescript
// Before:
constructor() {
  super()
  this.serviceUrl = process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL || 'http://localhost:3001'
}

// After:
constructor() {
  super()
  // Use Next.js API route as proxy to WhatsApp service
  this.serviceUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}
```

### WhatsApp Service Endpoints
Correct endpoints di WhatsApp service (port 3001):
- ✅ `/api/whatsapp/send` - Send message
- ✅ `/api/whatsapp/send-bulk` - Send bulk messages
- ✅ `/api/whatsapp/reconnect/:sessionId` - Reconnect session
- ✅ `/api/whatsapp/status/:sessionId` - Get session status
- ✅ `/health` - Health check

### Architecture Flow
```
Browser → Next.js API (/api/send-message) → WhatsApp Service (/api/whatsapp/send) → WhatsApp Web
```

### Environment Variables
```env
# .env.local (Next.js)
NEXT_PUBLIC_APP_URL=http://localhost:3000
WHATSAPP_SERVICE_URL=http://localhost:3001

# whatsapp-service/.env
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### Testing Steps
1. Verify WhatsApp service is running:
   ```bash
   cd whatsapp-service
   npm run dev
   ```
   Should see: `✓ WhatsApp Service running on port 3001`

2. Check session status in database:
   ```sql
   SELECT id, session_name, status FROM whatsapp_sessions;
   ```
   Status should be 'connected'

3. Test send message from chat interface

4. Check browser console - should see no errors

5. Verify message in database:
   ```sql
   SELECT id, content, status, is_from_me, created_at 
   FROM messages 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

6. Check WhatsApp service logs for confirmation:
   ```
   Sending message: { sessionId: '...', to: '...' }
   ```

---

## Summary of All Fixes

1. ✅ Agent dropdown empty - Removed `agent_status` filter
2. ✅ Direction column error - Changed to `is_from_me`
3. ✅ Status constraint error - Changed 'pending' to 'sent'
4. ✅ Error message field - Removed from update query
5. ✅ API route missing - Created `/api/send-message`
6. ✅ Wrong endpoint - Fixed to `/api/whatsapp/send`

### Current Status
All fixes applied. Send message should now work end-to-end.

### Next Steps
1. Restart both services (Next.js and WhatsApp service)
2. Test send message functionality
3. Monitor console and logs for any remaining issues


---

## Fix 7: Syntax Error - Duplicate if Statement

### Problem
Build error: "Parsing ecmascript/jsx source code failed"
Error di ContactDetailModal: Duplicate if statement

### Root Cause
Ada duplikasi baris code saat menghapus console.log:
```typescript
if (Object.keys(newErrors).length > 0) {
if (Object.keys(newErrors).length > 0) {  // Duplicate!
```

### Solution
Hapus baris duplikat.

### Files Changed
- `features/chat/components/shared/ContactDetailModal.tsx`

### Changes
```typescript
// Before:
if (Object.keys(newErrors).length > 0) {
if (Object.keys(newErrors).length > 0) {
  setErrors(newErrors)
  return
}

// After:
if (Object.keys(newErrors).length > 0) {
  setErrors(newErrors)
  return
}
```

### Testing
1. Restart Next.js dev server
2. Check browser console - no build errors
3. Open contact detail modal
4. Try to save without first name
5. Verify: Error message appears

---

## All Fixes Complete ✅

Total 7 fixes applied:
1. ✅ Agent dropdown empty
2. ✅ Direction column error
3. ✅ Status constraint error
4. ✅ Error message field
5. ✅ Send message API route
6. ✅ Wrong endpoint (404)
7. ✅ Syntax error (duplicate if)

**Status**: Ready for testing!


---

## Fix 8: Invalid Phone Number Saved to Database

### Problem
Nomor telepon yang disimpan ke database salah format:
- Tersimpan: `+62123265695629557` (18 karakter - terlalu panjang!)
- Seharusnya: `+6285155046155` (14 karakter)

### Root Cause
Saat incoming message, nomor dari `message.from` tidak divalidasi sebelum disimpan ke database.

### Solution
Added validation and logging in `saveIncomingMessage`:

```javascript
// Extract phone number from message.from
const rawFrom = message.from
console.log('Raw message.from:', rawFrom)

const phoneNumber = rawFrom.split('@')[0]
console.log('Extracted phone number:', phoneNumber)

// Validate phone number length
if (phoneNumber.length < 10 || phoneNumber.length > 15) {
  console.error('Invalid phone number length:', phoneNumber.length)
  return
}

// Format with + prefix
const formattedPhone = phoneNumber.startsWith('62') 
  ? `+${phoneNumber}` 
  : `+62${phoneNumber}`

console.log('Formatted phone:', formattedPhone)
```

### Files Changed
- `whatsapp-service/src/services/whatsapp.js` - Added validation in saveIncomingMessage
- `features/chat/hooks/useMessages.ts` - Added validation before sending
- `scripts/fix-phone-numbers.sql` - SQL script to fix existing data

### Testing
1. Send message from WhatsApp to the service
2. Check WhatsApp service logs for:
   ```
   📱 Raw message.from: 6285155046155@c.us
   📱 Extracted phone number: 6285155046155
   📞 Processing contact: { formatted: '+6285155046155', length: 14 }
   ```
3. Verify in database:
   ```sql
   SELECT phone_number, LENGTH(phone_number) FROM contacts;
   ```
4. Should be 12-15 characters

### Fix Existing Data
```sql
-- Fix specific wrong number
UPDATE contacts
SET phone_number = '+6285155046155'
WHERE phone_number = '+62123265695629557';

-- Or delete and let it recreate
DELETE FROM contacts WHERE LENGTH(phone_number) > 15;
```

---

## Summary of All Fixes

Total 8 fixes applied:
1. ✅ Agent dropdown empty
2. ✅ Direction column error
3. ✅ Status constraint error
4. ✅ Error message field
5. ✅ Send message API route
6. ✅ Wrong endpoint (404)
7. ✅ Syntax error (duplicate if)
8. ✅ Invalid phone number format

**Status**: All code fixes complete. Need to:
1. Fix existing data in database
2. Test with new incoming messages
3. Verify phone numbers are saved correctly
