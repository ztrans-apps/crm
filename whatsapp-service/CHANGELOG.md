# WhatsApp Service Changelog

## [Latest] - Auto-Detect Contact Name from WhatsApp

### ✨ New Features

#### 1. Auto-Save Contact Name from WhatsApp Pushname
- Saat pesan WhatsApp masuk, sistem otomatis mengambil nama dari profil WhatsApp pengirim (pushname)
- Nama otomatis disimpan ke database saat:
  - Contact baru dibuat (first message)
  - Contact sudah ada tapi nama masih kosong

#### 2. Enhanced Logging
- Menambahkan log untuk tracking pushname
- Log menampilkan apakah contact baru dibuat atau di-update
- Log menampilkan nama yang tersimpan

### 🔧 Technical Changes

#### Modified Files:
- `whatsapp-service/src/services/whatsapp.js`

#### Changes in `message` Event Handler:
```javascript
// Before:
await this.saveIncomingMessage(sessionId, message)

// After:
const contact = await message.getContact()
const pushname = contact.pushname || contact.name || null
await this.saveIncomingMessage(sessionId, message, pushname)
```

#### Changes in `saveIncomingMessage()` Method:
1. Added `pushname` parameter
2. Auto-save pushname when creating new contact
3. Auto-update contact name if empty and pushname available
4. Enhanced logging for contact operations

### 📊 Expected Behavior

#### Scenario 1: New Contact (First Message)
```
Input: WhatsApp message from +6281234567890 with pushname "John Doe"
Result: 
  - Contact created with name "John Doe"
  - No orange dot indicator (contact already has name)
  - Name appears in conversation list
```

#### Scenario 2: Existing Contact with Empty Name
```
Input: WhatsApp message from existing contact (name = null)
Result:
  - Contact name updated to pushname
  - Orange dot disappears
  - Name appears in conversation list
```

#### Scenario 3: Existing Contact with Name
```
Input: WhatsApp message from existing contact (name = "Jane Smith")
Result:
  - Contact name NOT changed (keeps "Jane Smith")
  - No orange dot (already has name)
  - Existing name preserved
```

### 🧪 Testing

1. **Reset database** (optional):
   ```bash
   # Run scripts/reset-chat-data.sql in Supabase
   ```

2. **Restart WhatsApp service**:
   ```bash
   cd whatsapp-service
   npm restart
   ```

3. **Send test message**:
   - Send WhatsApp message from new number
   - Check console logs for pushname
   - Verify in UI that name appears
   - Check database: `SELECT * FROM contacts;`

4. **Verify logs**:
   ```
   📨 Message received!
     - From: 6281234567890@c.us
     - Contact pushname: John Doe
     📞 Processing contact:
       phoneNumber: +6281234567890
       pushname: John Doe
     ➕ Creating new contact with pushname: John Doe
     ✅ Contact created with name: John Doe
     ✓ Message saved to database
     ✓ Contact name: John Doe
   ```

### 🐛 Known Issues

None currently.

### 📝 Notes

- Pushname is the name set in WhatsApp profile by the user
- Different from phone contact name
- Can be null if user hasn't set a name in WhatsApp
- Manual edits to contact name won't be overwritten by pushname

### 🔄 Migration

No database migration needed. Existing contacts will be updated automatically when they send new messages (if name is empty).

### ⚙️ Configuration

No configuration changes needed. Feature works automatically.

### 🎯 Related Features

- Contact Detail Modal (save contact manually)
- Orange dot indicator (shows unsaved contacts)
- Green checkmark (shows saved contacts)
- Conversation list (displays contact names)
