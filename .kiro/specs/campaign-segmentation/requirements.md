# Campaign Segmentation & Broadcast System - Requirements

## Overview
Sistem Campaign Segmentation memungkinkan owner untuk membuat segment customer berdasarkan kriteria tertentu dan mengirim broadcast message ke segment tersebut melalui WhatsApp.

## User Stories

### 1. Segment Management
**As an owner**, I want to create and manage customer segments so that I can organize contacts for targeted campaigns.

**Acceptance Criteria:**
- 1.1 Owner dapat membuat segment baru dengan nama dan deskripsi
- 1.2 Owner dapat memilih kriteria segmentasi:
  - Label (dari chat labels)
  - Workflow status (incoming, in_progress, resolved, etc.)
  - Last interaction date range
  - Custom fields dari contact metadata
  - Conversation count (jumlah percakapan)
  - Rating/review score
- 1.3 Owner dapat melihat preview jumlah contacts yang match dengan kriteria
- 1.4 Owner dapat menyimpan segment untuk digunakan kembali
- 1.5 Owner dapat edit dan delete segment
- 1.6 Owner dapat melihat list semua segments dengan statistik

### 2. Dynamic Segment Filtering
**As an owner**, I want segments to be dynamic so that they automatically include new contacts that match the criteria.

**Acceptance Criteria:**
- 2.1 Segment secara otomatis update ketika ada contact baru yang match
- 2.2 Owner dapat memilih antara dynamic segment atau static snapshot
- 2.3 Owner dapat refresh segment untuk melihat update terbaru
- 2.4 System menampilkan last updated timestamp untuk segment

### 3. Campaign Creation
**As an owner**, I want to create broadcast campaigns so that I can send messages to multiple contacts at once.

**Acceptance Criteria:**
- 3.1 Owner dapat membuat campaign baru dengan:
  - Campaign name
  - Target segment (pilih dari saved segments)
  - Message content (text, media, template)
  - Schedule (send now atau schedule untuk nanti)
- 3.2 Owner dapat preview message sebelum send
- 3.3 Owner dapat test send ke nomor tertentu
- 3.4 Owner dapat melihat estimasi jumlah recipients
- 3.5 Owner dapat save campaign as draft

### 4. Message Templates
**As an owner**, I want to use message templates with variables so that I can personalize broadcast messages.

**Acceptance Criteria:**
- 4.1 Owner dapat menggunakan variables dalam message:
  - {name} - Contact name
  - {phone} - Phone number
  - Custom fields dari contact metadata
- 4.2 System menampilkan preview dengan sample data
- 4.3 Owner dapat save templates untuk reuse
- 4.4 Owner dapat attach media (image, document, video)

### 5. Campaign Scheduling
**As an owner**, I want to schedule campaigns so that messages are sent at optimal times.

**Acceptance Criteria:**
- 5.1 Owner dapat pilih tanggal dan waktu untuk send
- 5.2 Owner dapat set timezone
- 5.3 Owner dapat cancel scheduled campaign sebelum execution
- 5.4 System menampilkan list scheduled campaigns
- 5.5 Owner menerima notification ketika campaign dimulai

### 6. Broadcast Execution
**As a system**, I want to send messages in batches so that I don't overwhelm the WhatsApp API.

**Acceptance Criteria:**
- 6.1 System mengirim messages dalam batches (configurable rate limit)
- 6.2 System menangani errors dan retry logic
- 6.3 System mencatat delivery status untuk setiap message
- 6.4 System menampilkan progress bar saat campaign berjalan
- 6.5 System dapat pause/resume campaign execution

### 7. Campaign Analytics
**As an owner**, I want to see campaign performance metrics so that I can measure effectiveness.

**Acceptance Criteria:**
- 7.1 Owner dapat melihat campaign statistics:
  - Total recipients
  - Messages sent
  - Messages delivered
  - Messages read (open rate)
  - Messages failed
  - Messages replied (reply rate)
  - Response rate
  - Opt-out rate
  - Average time to reply
  - Engagement rate by time period
- 7.2 Owner dapat export campaign report
- 7.3 Owner dapat melihat individual message status
- 7.4 Owner dapat filter failed messages dan retry

### 8. Opt-out Management
**As a customer**, I want to opt-out from broadcasts so that I don't receive unwanted messages.

**Acceptance Criteria:**
- 8.1 Customer dapat reply dengan keyword untuk opt-out (e.g., "STOP", "BERHENTI")
- 8.2 System secara otomatis menandai contact sebagai opted-out
- 8.3 Opted-out contacts tidak menerima broadcast messages
- 8.4 Owner dapat melihat list opted-out contacts
- 8.5 Owner dapat manually opt-in contact kembali

### 9. Compliance & Rate Limiting
**As a system**, I want to enforce rate limits so that we comply with WhatsApp policies.

**Acceptance Criteria:**
- 9.1 System enforce rate limit (configurable, default: 20 msg/second)
- 9.2 System menampilkan warning jika campaign terlalu besar
- 9.3 System mencegah spam dengan cooldown period per contact
- 9.4 System log semua broadcast activities untuk audit
- 9.5 Owner dapat set custom rate limit per campaign

### 10. WhatsApp Business API Integration
**As an owner**, I want to use official WhatsApp Business API so that campaigns are compliant and reliable.

**Acceptance Criteria:**
- 10.1 System menggunakan WhatsApp Business API resmi untuk broadcast
- 10.2 System support WhatsApp approved message templates
- 10.3 Owner dapat manage WhatsApp Business Account connection
- 10.4 System menampilkan API quota dan rate limits
- 10.5 System handle WhatsApp API errors dengan proper messaging

### 11. Approved Template Management
**As an owner**, I want to use WhatsApp approved templates so that my campaigns comply with WhatsApp policies.

**Acceptance Criteria:**
- 11.1 Owner dapat sync approved templates dari WhatsApp Business Manager
- 11.2 Owner dapat melihat list approved templates dengan status
- 11.3 Owner dapat select approved template untuk campaign
- 11.4 System menampilkan template preview dengan variables
- 11.5 System validate template variables sebelum send
- 11.6 Owner dapat request new template approval (link ke WhatsApp Manager)

### 12. Message Tracking & Analytics
**As an owner**, I want to track message opens and replies so that I can measure campaign engagement.

**Acceptance Criteria:**
- 12.1 System track message delivery status (sent, delivered, read)
- 12.2 System track message read receipts (jika available dari WhatsApp)
- 12.3 System track customer replies ke campaign messages
- 12.4 Owner dapat melihat open rate per campaign
- 12.5 Owner dapat melihat reply rate per campaign
- 12.6 Owner dapat melihat time-to-reply metrics
- 12.7 System menampilkan engagement timeline (hourly/daily)
- 12.8 Owner dapat export tracking data

### 13. Permission Control
**As an owner**, I want to control who can create campaigns so that only authorized users can send broadcasts.

**Acceptance Criteria:**
- 13.1 Only owner role dapat create/edit/delete campaigns
- 13.2 Supervisor dapat view campaigns dan analytics
- 13.3 Agent tidak dapat access campaign features
- 13.4 System log semua campaign actions dengan user info

## Technical Requirements

### Database Schema

#### segments table
```sql
- id (uuid, primary key)
- name (text, required)
- description (text)
- criteria (jsonb) -- filter criteria
- is_dynamic (boolean, default true)
- contact_count (integer)
- created_by (uuid, foreign key to profiles)
- created_at (timestamp)
- updated_at (timestamp)
- last_refreshed_at (timestamp)
```

#### campaigns table
```sql
- id (uuid, primary key)
- name (text, required)
- segment_id (uuid, foreign key to segments)
- message_content (text, required)
- message_type (enum: text, image, document, video, template)
- media_url (text, nullable)
- template_id (text, nullable) -- WhatsApp approved template ID
- template_name (text, nullable) -- WhatsApp template name
- template_language (text, nullable) -- e.g., 'id', 'en'
- template_variables (jsonb)
- status (enum: draft, scheduled, running, completed, failed, cancelled, paused)
- scheduled_at (timestamp, nullable)
- started_at (timestamp, nullable)
- completed_at (timestamp, nullable)
- paused_at (timestamp, nullable)
- total_recipients (integer)
- messages_sent (integer, default 0)
- messages_delivered (integer, default 0)
- messages_read (integer, default 0)
- messages_failed (integer, default 0)
- messages_replied (integer, default 0)
- rate_limit (integer, default 20) -- messages per second
- created_by (uuid, foreign key to profiles)
- created_at (timestamp)
- updated_at (timestamp)
```

#### campaign_messages table
```sql
- id (uuid, primary key)
- campaign_id (uuid, foreign key to campaigns)
- contact_id (uuid, foreign key to contacts)
- phone_number (text)
- message_content (text) -- personalized content
- whatsapp_message_id (text, nullable) -- WhatsApp API message ID
- status (enum: pending, sent, delivered, failed, read)
- error_message (text, nullable)
- sent_at (timestamp, nullable)
- delivered_at (timestamp, nullable)
- read_at (timestamp, nullable)
- replied_at (timestamp, nullable)
- reply_content (text, nullable)
- created_at (timestamp)
```

#### contact_preferences table
```sql
- id (uuid, primary key)
- contact_id (uuid, foreign key to contacts)
- opted_out (boolean, default false)
- opted_out_at (timestamp, nullable)
- opted_out_reason (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

#### whatsapp_templates table
```sql
- id (uuid, primary key)
- template_id (text, required) -- WhatsApp template ID
- template_name (text, required)
- language (text, required)
- category (text) -- MARKETING, UTILITY, AUTHENTICATION
- status (enum: approved, pending, rejected)
- components (jsonb) -- template structure (header, body, footer, buttons)
- variables (jsonb) -- list of variables in template
- last_synced_at (timestamp)
- created_at (timestamp)
- updated_at (timestamp)
```

### API Endpoints

#### Segments
- `GET /api/segments` - List all segments
- `POST /api/segments` - Create new segment
- `GET /api/segments/:id` - Get segment details
- `PUT /api/segments/:id` - Update segment
- `DELETE /api/segments/:id` - Delete segment
- `POST /api/segments/:id/preview` - Preview contacts in segment
- `POST /api/segments/:id/refresh` - Refresh dynamic segment

#### Campaigns
- `GET /api/campaigns` - List all campaigns
- `POST /api/campaigns` - Create new campaign
- `GET /api/campaigns/:id` - Get campaign details
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign
- `POST /api/campaigns/:id/send` - Execute campaign
- `POST /api/campaigns/:id/schedule` - Schedule campaign
- `POST /api/campaigns/:id/cancel` - Cancel campaign
- `POST /api/campaigns/:id/pause` - Pause running campaign
- `POST /api/campaigns/:id/resume` - Resume paused campaign
- `GET /api/campaigns/:id/analytics` - Get campaign analytics
- `GET /api/campaigns/:id/messages` - Get campaign messages with status

#### Templates
- `GET /api/campaign-templates` - List message templates
- `POST /api/campaign-templates` - Create template
- `PUT /api/campaign-templates/:id` - Update template
- `DELETE /api/campaign-templates/:id` - Delete template

#### WhatsApp Templates
- `GET /api/whatsapp/templates` - List approved WhatsApp templates
- `POST /api/whatsapp/templates/sync` - Sync templates from WhatsApp Business Manager
- `GET /api/whatsapp/templates/:id` - Get template details
- `POST /api/whatsapp/templates/:id/preview` - Preview template with variables

#### Campaign Tracking
- `GET /api/campaigns/:id/tracking` - Get detailed tracking data
- `GET /api/campaigns/:id/engagement` - Get engagement metrics (open/reply rates)
- `GET /api/campaigns/:id/timeline` - Get engagement timeline
- `GET /api/campaigns/:id/replies` - Get all customer replies

### UI Pages

1. **Segments Page** (`/segments`)
   - List of all segments with stats
   - Create/Edit segment modal
   - Segment preview with contact list

2. **Campaigns Page** (`/campaigns`)
   - List of all campaigns with status
   - Create campaign wizard (multi-step)
   - Campaign analytics dashboard

3. **Campaign Builder** (`/campaigns/new`)
   - Step 1: Select segment
   - Step 2: Compose message
   - Step 3: Schedule
   - Step 4: Review & Send

4. **Campaign Analytics** (`/campaigns/:id/analytics`)
   - Performance metrics
   - Message status breakdown
   - Open rate and reply rate tracking
   - Engagement timeline chart
   - Customer replies list
   - Export functionality

5. **WhatsApp Templates** (`/whatsapp/templates`)
   - List of approved WhatsApp templates
   - Sync button to fetch from WhatsApp Business Manager
   - Template preview with variables
   - Template status indicators
   - Link to WhatsApp Business Manager for new approvals

## Non-Functional Requirements

### Performance
- Segment preview harus load dalam < 2 detik
- Campaign execution harus handle 10,000+ contacts
- Rate limiting harus configurable dan reliable
- Message tracking harus real-time atau near real-time (< 5 detik delay)

### Security
- Only owner dapat create/manage campaigns
- All broadcast activities harus di-log
- Sensitive data (phone numbers) harus di-protect
- WhatsApp Business API credentials harus encrypted

### Scalability
- System harus support multiple concurrent campaigns
- Queue system untuk message processing
- Background jobs untuk scheduled campaigns
- Webhook handling untuk message status updates dari WhatsApp

### Reliability
- Retry logic untuk failed messages
- Error handling dan logging
- Campaign dapat di-pause dan resume

## Dependencies
- Existing contacts system
- WhatsApp Business API integration
- WhatsApp Business Manager account
- Approved message templates dari WhatsApp
- Labels system
- Workflow status system
- Permission/RBAC system
- Webhook endpoint untuk WhatsApp status updates

## Out of Scope (Future Enhancements)
- A/B testing campaigns
- Advanced analytics (conversion tracking, funnel analysis)
- Multi-channel campaigns (SMS, Email)
- Campaign automation triggers
- AI-powered segment recommendations
- Predictive analytics untuk best send time
- Rich media templates (carousel, product catalog)

## Success Metrics
- Owner dapat create segment dalam < 2 menit
- Campaign dapat di-execute untuk 1000 contacts dalam < 10 menit
- Message delivery rate > 95%
- Message read rate tracking accuracy > 90%
- System dapat handle 5+ concurrent campaigns
- Zero data loss untuk campaign messages
- Webhook processing latency < 5 detik
- Template sync dari WhatsApp < 30 detik
