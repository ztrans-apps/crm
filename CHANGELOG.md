# Changelog

## 2026-02-21 - Meta-Standard Template Creation Wizard

### Added
- **6-Step Template Creation Wizard**: Implemented Meta's standard WhatsApp Business template creation flow
  - **Step 1: Basic Information**: Template name, language, and category selection
  - **Step 2: Header Configuration**: Support for TEXT, IMAGE, VIDEO, and DOCUMENT headers
  - **Step 3: Message Body**: Body text with variable support ({{1}}, {{2}}, etc.) and optional footer
  - **Step 4: Buttons & Actions**: Call-to-Action (max 2) and Quick Reply (max 3) buttons
  - **Step 5: Variables & Examples**: Auto-detection and example values for template variables
  - **Step 6: Review & Submit**: Complete preview with WhatsApp-style message rendering

### Features
- **Real-time WhatsApp Preview**: Live preview showing exactly how message will appear on mobile
- **Variable Auto-Detection**: Automatically extracts variables from message body
- **File Upload Support**: Upload images, videos, or documents for header media
- **Validation**: Step-by-step validation ensuring all required fields are filled
- **Progress Indicator**: Visual progress bar showing current step and completion status
- **Guidelines & Help**: Contextual help text and Meta's official guidelines in each step

### Database Changes
- Added new columns to `broadcast_templates` table:
  - `language`: Template language code (id, en, en_US, etc.)
  - `header_format`: Header type (NONE, TEXT, IMAGE, VIDEO, DOCUMENT)
  - `header_text`: Text header content (max 60 chars)
  - `header_media_url`: URL to uploaded header media
  - `body_text`: Main message body (max 1024 chars)
  - `footer_text`: Optional footer text (max 60 chars)
  - `button_type`: Button type (NONE, CALL_TO_ACTION, QUICK_REPLY)
  - `buttons`: JSONB array of button objects
  - `variables`: JSONB array of variable objects
  - `status`: Template approval status (DRAFT, PENDING, APPROVED, REJECTED)
  - `rejection_reason`: Reason if template was rejected
  - `metadata`: Additional template metadata

### API Changes
- Updated `/api/broadcast/templates` POST endpoint to support:
  - Multipart form data for file uploads
  - New template structure with all wizard fields
  - Backward compatibility with old JSON format

### UI/UX Improvements
- Modern step-by-step wizard interface
- Color-coded progress indicators (teal theme matching WhatsApp)
- Responsive design for all screen sizes
- Smooth transitions between steps
- Clear validation messages and character counters

### Files Added
- `modules/broadcast/components/CreateTemplateWizard.tsx`: Main wizard component with all 6 steps

### Files Modified
- `modules/broadcast/components/TemplateManagement.tsx`: Integrated wizard with existing template management
- `modules/broadcast/components/index.ts`: Added wizard export
- `app/api/broadcast/templates/route.ts`: Enhanced to support new template format
- `README.md`: Added comprehensive documentation for template creation flow

### Migration Required
- Run migration: `supabase/migrations/20260221000000_add_template_wizard_fields.sql`
- Existing templates will be automatically migrated (content → body_text)

### Notes
- Templates created with wizard are marked as DRAFT status
- File upload currently uses placeholder (implement Supabase Storage in production)
- Old template creation form still available for backward compatibility
- Wizard follows Meta's official WhatsApp Business API guidelines

---

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
