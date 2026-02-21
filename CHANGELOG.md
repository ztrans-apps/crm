# Changelog

## 2026-02-21 - Phone Number & Channel Message Fixes

### Fixed
- **Phone Number Validation**: Added comprehensive validation to prevent corrupt phone numbers from being saved
  - Length validation (10-15 digits)
  - Digit-only validation
  - Indonesian format validation (+628xxxxxxxxxx)
  
- **Channel Message Handling**: Properly handle WhatsApp Channel messages
  - Skip pure channel broadcasts (no sender info)
  - Process channel messages with sender info (participant or senderPn field)
  - Extract actual phone number from senderPn field
  
- **Message Type Filtering**: Added filters for non-direct messages
  - Skip group messages (@g.us)
  - Skip broadcast messages (@broadcast)
  - Skip channel messages without sender (@lid)
  - Process direct messages (@s.whatsapp.net)

### Changed
- Refactored `saveIncomingMessage()` into two functions for better code organization
  - `saveIncomingMessage()`: Filter and route messages
  - `processDirectMessage()`: Process valid direct messages

### Files Modified
- `whatsapp-service/src/services/whatsapp.js`: Added validation and filtering logic

### Known Issues
- Real-time update requires manual refresh (low priority)
- Supabase Realtime or Socket.IO needs configuration for auto-update

### Migration Notes
- No database migration required
- Restart WhatsApp service to apply changes: `./scripts/whatsapp-service.sh restart`
