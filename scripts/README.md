# Scripts

Kumpulan script untuk membantu development dan maintenance.

## Available Scripts

### 1. reset-chat-data.sql
Reset semua data chat (conversations, messages, contacts).

**Usage:**
```bash
psql -h your-host -U your-user -d your-db -f scripts/reset-chat-data.sql
```

**Warning:** Ini akan menghapus SEMUA data chat!

---

### 2. restart-services.sh (macOS/Linux)
Restart Next.js dan WhatsApp service.

**Usage:**
```bash
./scripts/restart-services.sh
```

---

### 3. restart-services.bat (Windows)
Restart Next.js dan WhatsApp service di Windows.

**Usage:**
```cmd
scripts\restart-services.bat
```

---

### 4. verify-setup.sh
Verifikasi setup dan konfigurasi.

**Usage:**
```bash
./scripts/verify-setup.sh
```

Akan check:
- WhatsApp service running
- Next.js running
- Environment variables
- Dependencies installed
- API endpoints

---

### 5. cleanup-whatsapp.sh ⭐ NEW
Cleanup WhatsApp service (kill Chrome, remove locks).

**Usage:**
```bash
./scripts/cleanup-whatsapp.sh
```

Akan:
- Kill Chrome/Chromium processes
- Remove lock files
- Optional: Remove session cache

**Use when:**
- Error "browser already running"
- Session stuck
- Need fresh start

---

### 6. kill-chrome.sh ⭐ NEW
Quick kill Chrome processes dan remove locks.

**Usage:**
```bash
./scripts/kill-chrome.sh
```

**Use when:**
- Error "browser already running"
- Chrome not closing properly

---

## Common Issues

### Issue: "Browser already running"
**Solution:**
```bash
./scripts/kill-chrome.sh
cd whatsapp-service
npm run dev
```

### Issue: Session stuck or not responding
**Solution:**
```bash
./scripts/cleanup-whatsapp.sh
# Choose 'y' to remove cache
cd whatsapp-service
npm run dev
# Scan QR code again
```

### Issue: Services not starting
**Solution:**
```bash
./scripts/verify-setup.sh
# Follow suggestions from output
```

---

## WhatsApp Service Commands

### Start Service
```bash
cd whatsapp-service
npm run dev
```

### Cleanup & Restart
```bash
cd whatsapp-service
npm run cleanup
npm run dev
```

### Quick Restart (with cleanup)
```bash
cd whatsapp-service
npm run restart
```

---

## Quick Reference

| Problem | Solution |
|---------|----------|
| Browser already running | `./scripts/kill-chrome.sh` |
| Session stuck | `./scripts/cleanup-whatsapp.sh` |
| Need fresh start | `./scripts/cleanup-whatsapp.sh` (remove cache) |
| Verify setup | `./scripts/verify-setup.sh` |
| Reset all data | `psql ... -f scripts/reset-chat-data.sql` |
| Restart services | `./scripts/restart-services.sh` |

---

## Notes

- All `.sh` scripts are for macOS/Linux
- Use `.bat` scripts for Windows
- Make scripts executable: `chmod +x scripts/*.sh`
- Always backup data before running reset scripts
