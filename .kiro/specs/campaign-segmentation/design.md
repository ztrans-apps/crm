# Campaign Segmentation & Broadcast System - Design Document

## Overview

The Campaign Segmentation & Broadcast System enables business owners to create targeted customer segments and send broadcast messages via WhatsApp Business API. This system provides a complete solution for managing marketing campaigns with dynamic segmentation, approved template management, message tracking, and comprehensive analytics.

### Key Features

- Dynamic customer segmentation with multiple filter criteria
- WhatsApp Business API integration for official, compliant broadcasts
- Approved message template management from WhatsApp Business Manager
- Real-time message tracking (delivery, read receipts, replies)
- Campaign scheduling with configurable rate limiting
- Comprehensive analytics dashboard with engagement metrics
- Opt-out management for customer preferences
- Permission-based access control (owner-only campaign creation)

### Technology Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: Supabase (PostgreSQL)
- **WhatsApp Integration**: WhatsApp Business API (official)
- **Real-time**: Socket.IO for status updates
- **Storage**: Supabase Storage for media files
- **Queue System**: Background jobs for campaign execution

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Segments    │  │  Campaigns   │  │  Analytics   │      │
│  │  Management  │  │  Builder     │  │  Dashboard   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Layer (Next.js Routes)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Segment API │  │ Campaign API │  │ Template API │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────┐
│   Supabase   │  │  WhatsApp        │  │  Background  │
│   Database   │  │  Business API    │  │  Job Queue   │
└──────────────┘  └──────────────────┘  └──────────────┘
        │                   │                   │
        └───────────────────┴───────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │  Webhook Handler │
                  │  (Status Updates)│
                  └──────────────────┘
```

### Data Flow

1. **Segment Creation**: Owner defines filter criteria → System queries contacts → Preview count displayed
2. **Campaign Creation**: Owner selects segment → Chooses template → Schedules campaign → System validates
3. **Campaign Execution**: Background job processes queue → Sends via WhatsApp API → Updates status
4. **Status Tracking**: WhatsApp webhooks → Update message status → Real-time UI updates via Socket.IO
5. **Analytics**: Aggregate message statuses → Calculate metrics → Display in dashboard

## Components and Interfaces

### 1. Segment Service

Handles customer segmentation with dynamic filtering.

```typescript
interface SegmentService {
  // Create a new segment
  createSegment(data: CreateSegmentInput): Promise<Segment>
  
  // Update existing segment
  updateSegment(id: string, data: UpdateSegmentInput): Promise<Segment>
  
  // Delete segment
  deleteSegment(id: string): Promise<void>
  
  // Get segment by ID
  getSegment(id: string): Promise<Segment>
  
  // List all segments
  listSegments(userId: string): Promise<Segment[]>
  
  // Preview contacts matching segment criteria
  previewSegment(criteria: SegmentCriteria): Promise<ContactPreview>
  
  // Refresh dynamic segment (recalculate contacts)
  refreshSegment(id: string): Promise<Segment>
  
  // Get contacts in segment
  getSegmentContacts(id: string, options?: PaginationOptions): Promise<Contact[]>
}

interface CreateSegmentInput {
  name: string
  description?: string
  criteria: SegmentCriteria
  isDynamic: boolean
  userId: string
}

interface SegmentCriteria {
  labels?: string[]  // Filter by label IDs
  workflowStatus?: string[]  // Filter by workflow status
  lastInteractionDateRange?: DateRange
  customFields?: Record<string, any>
  conversationCount?: NumberRange
  ratingScore?: NumberRange
}

interface ContactPreview {
  count: number
  sample: Contact[]  // First 10 contacts
}
```

### 2. Campaign Service

Manages campaign lifecycle from creation to execution.

```typescript
interface CampaignService {
  // Create campaign
  createCampaign(data: CreateCampaignInput): Promise<Campaign>
  
  // Update campaign
  updateCampaign(id: string, data: UpdateCampaignInput): Promise<Campaign>
  
  // Delete campaign
  deleteCampaign(id: string): Promise<void>
  
  // Get campaign
  getCampaign(id: string): Promise<Campaign>
  
  // List campaigns
  listCampaigns(userId: string, filters?: CampaignFilters): Promise<Campaign[]>
  
  // Schedule campaign
  scheduleCampaign(id: string, scheduledAt: Date): Promise<Campaign>
  
  // Execute campaign immediately
  executeCampaign(id: string): Promise<void>
  
  // Pause running campaign
  pauseCampaign(id: string): Promise<Campaign>
  
  // Resume paused campaign
  resumeCampaign(id: string): Promise<Campaign>
  
  // Cancel scheduled campaign
  cancelCampaign(id: string): Promise<Campaign>
  
  // Test send to specific number
  testSend(campaignId: string, phoneNumber: string): Promise<void>
}

interface CreateCampaignInput {
  name: string
  segmentId: string
  messageContent: string
  messageType: 'text' | 'template'
  templateId?: string
  templateName?: string
  templateLanguage?: string
  templateVariables?: Record<string, string>
  mediaUrl?: string
  scheduledAt?: Date
  rateLimit?: number  // messages per second
  userId: string
}

interface CampaignFilters {
  status?: CampaignStatus[]
  dateRange?: DateRange
}
```

### 3. WhatsApp Template Service

Manages WhatsApp approved templates.

```typescript
interface WhatsAppTemplateService {
  // Sync templates from WhatsApp Business Manager
  syncTemplates(userId: string): Promise<SyncResult>
  
  // Get all templates
  getTemplates(userId: string): Promise<WhatsAppTemplate[]>
  
  // Get template by ID
  getTemplate(id: string): Promise<WhatsAppTemplate>
  
  // Preview template with variables
  previewTemplate(templateId: string, variables: Record<string, string>): Promise<string>
  
  // Validate template variables
  validateTemplateVariables(templateId: string, variables: Record<string, string>): Promise<ValidationResult>
}

interface WhatsAppTemplate {
  id: string
  templateId: string  // WhatsApp template ID
  templateName: string
  language: string
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
  status: 'approved' | 'pending' | 'rejected'
  components: TemplateComponent[]
  variables: string[]  // List of variable names
  lastSyncedAt: Date
}

interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS'
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'
  text?: string
  example?: string[]
}

interface SyncResult {
  synced: number
  added: number
  updated: number
  errors: string[]
}
```

### 4. Campaign Execution Service

Handles background processing of campaign messages.

```typescript
interface CampaignExecutionService {
  // Start campaign execution
  startExecution(campaignId: string): Promise<void>
  
  // Process batch of messages
  processBatch(campaignId: string, batchSize: number): Promise<BatchResult>
  
  // Retry failed messages
  retryFailed(campaignId: string, messageIds?: string[]): Promise<void>
  
  // Get execution progress
  getProgress(campaignId: string): Promise<ExecutionProgress>
}

interface BatchResult {
  processed: number
  succeeded: number
  failed: number
  errors: MessageError[]
}

interface ExecutionProgress {
  totalRecipients: number
  messagesSent: number
  messagesDelivered: number
  messagesFailed: number
  percentComplete: number
  estimatedTimeRemaining: number  // seconds
}

interface MessageError {
  messageId: string
  contactId: string
  phoneNumber: string
  error: string
  errorCode?: string
}
```

### 5. Analytics Service

Provides campaign performance metrics.

```typescript
interface AnalyticsService {
  // Get campaign statistics
  getCampaignStats(campaignId: string): Promise<CampaignStats>
  
  // Get engagement timeline
  getEngagementTimeline(campaignId: string, interval: 'hourly' | 'daily'): Promise<TimelineData[]>
  
  // Get message details
  getMessageDetails(campaignId: string, filters?: MessageFilters): Promise<CampaignMessage[]>
  
  // Get customer replies
  getCustomerReplies(campaignId: string): Promise<Reply[]>
  
  // Export campaign report
  exportReport(campaignId: string, format: 'csv' | 'json'): Promise<string>
}

interface CampaignStats {
  totalRecipients: number
  messagesSent: number
  messagesDelivered: number
  messagesRead: number
  messagesFailed: number
  messagesReplied: number
  openRate: number  // percentage
  replyRate: number  // percentage
  optOutRate: number  // percentage
  averageTimeToReply: number  // seconds
  engagementRate: number  // percentage
}

interface TimelineData {
  timestamp: Date
  sent: number
  delivered: number
  read: number
  replied: number
}

interface Reply {
  messageId: string
  contactId: string
  contactName: string
  phoneNumber: string
  replyContent: string
  repliedAt: Date
}
```

### 6. Opt-out Service

Manages customer opt-out preferences.

```typescript
interface OptOutService {
  // Mark contact as opted out
  optOut(contactId: string, reason?: string): Promise<void>
  
  // Opt contact back in
  optIn(contactId: string): Promise<void>
  
  // Check if contact is opted out
  isOptedOut(contactId: string): Promise<boolean>
  
  // Get all opted-out contacts
  getOptedOutContacts(userId: string): Promise<ContactPreference[]>
  
  // Process opt-out keyword from message
  processOptOutKeyword(message: string, contactId: string): Promise<boolean>
}

interface ContactPreference {
  id: string
  contactId: string
  optedOut: boolean
  optedOutAt?: Date
  optedOutReason?: string
}
```

### 7. WhatsApp Business API Client

Wrapper for WhatsApp Business API calls.

```typescript
interface WhatsAppBusinessClient {
  // Send template message
  sendTemplateMessage(params: SendTemplateParams): Promise<MessageResponse>
  
  // Get message status
  getMessageStatus(messageId: string): Promise<MessageStatus>
  
  // Get account info
  getAccountInfo(): Promise<AccountInfo>
  
  // Get templates
  getTemplates(): Promise<WhatsAppTemplate[]>
  
  // Handle webhook
  handleWebhook(payload: WebhookPayload): Promise<void>
}

interface SendTemplateParams {
  to: string  // Phone number
  templateName: string
  templateLanguage: string
  components: TemplateComponentParams[]
}

interface TemplateComponentParams {
  type: 'header' | 'body' | 'button'
  parameters: ParameterValue[]
}

interface ParameterValue {
  type: 'text' | 'image' | 'video' | 'document'
  text?: string
  image?: MediaObject
  video?: MediaObject
  document?: MediaObject
}

interface MessageResponse {
  messageId: string
  status: 'sent' | 'failed'
  error?: string
}

interface WebhookPayload {
  entry: WebhookEntry[]
}

interface WebhookEntry {
  changes: WebhookChange[]
}

interface WebhookChange {
  value: {
    messaging_product: 'whatsapp'
    metadata: {
      phone_number_id: string
    }
    statuses?: StatusUpdate[]
    messages?: IncomingMessage[]
  }
}

interface StatusUpdate {
  id: string  // message ID
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  recipient_id: string
  errors?: ErrorDetail[]
}
```

## Data Models

### Database Schema Extensions

The following tables extend the existing database schema:

```sql
-- Segments table
CREATE TABLE segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL,
  is_dynamic BOOLEAN DEFAULT true,
  contact_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_refreshed_at TIMESTAMP
);

-- Campaigns table
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  segment_id UUID REFERENCES segments(id) ON DELETE SET NULL,
  message_content TEXT NOT NULL,
  message_type TEXT CHECK (message_type IN ('text', 'template')) NOT NULL,
  media_url TEXT,
  template_id TEXT,
  template_name TEXT,
  template_language TEXT,
  template_variables JSONB,
  status TEXT CHECK (status IN ('draft', 'scheduled', 'running', 'completed', 'failed', 'cancelled', 'paused')) DEFAULT 'draft',
  scheduled_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  paused_at TIMESTAMP,
  total_recipients INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  messages_delivered INTEGER DEFAULT 0,
  messages_read INTEGER DEFAULT 0,
  messages_failed INTEGER DEFAULT 0,
  messages_replied INTEGER DEFAULT 0,
  rate_limit INTEGER DEFAULT 20,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Campaign messages table
CREATE TABLE campaign_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  phone_number TEXT NOT NULL,
  message_content TEXT NOT NULL,
  whatsapp_message_id TEXT,
  status TEXT CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read')) DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  replied_at TIMESTAMP,
  reply_content TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Contact preferences table
CREATE TABLE contact_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL UNIQUE,
  opted_out BOOLEAN DEFAULT false,
  opted_out_at TIMESTAMP,
  opted_out_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- WhatsApp templates table
CREATE TABLE whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  template_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  language TEXT NOT NULL,
  category TEXT CHECK (category IN ('MARKETING', 'UTILITY', 'AUTHENTICATION')),
  status TEXT CHECK (status IN ('approved', 'pending', 'rejected')) DEFAULT 'pending',
  components JSONB NOT NULL,
  variables JSONB,
  last_synced_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, template_id, language)
);

-- Indexes for performance
CREATE INDEX idx_segments_created_by ON segments(created_by);
CREATE INDEX idx_campaigns_created_by ON campaigns(created_by);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_scheduled_at ON campaigns(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_campaign_messages_campaign_id ON campaign_messages(campaign_id);
CREATE INDEX idx_campaign_messages_status ON campaign_messages(status);
CREATE INDEX idx_campaign_messages_whatsapp_id ON campaign_messages(whatsapp_message_id);
CREATE INDEX idx_contact_preferences_contact_id ON contact_preferences(contact_id);
CREATE INDEX idx_contact_preferences_opted_out ON contact_preferences(opted_out);
CREATE INDEX idx_whatsapp_templates_user_id ON whatsapp_templates(user_id);
CREATE INDEX idx_whatsapp_templates_status ON whatsapp_templates(status);
```

### TypeScript Type Definitions

```typescript
type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused'
type MessageStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read'
type TemplateStatus = 'approved' | 'pending' | 'rejected'
type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'

interface Segment {
  id: string
  name: string
  description?: string
  criteria: SegmentCriteria
  isDynamic: boolean
  contactCount: number
  createdBy: string
  createdAt: Date
  updatedAt: Date
  lastRefreshedAt?: Date
}

interface Campaign {
  id: string
  name: string
  segmentId?: string
  messageContent: string
  messageType: 'text' | 'template'
  mediaUrl?: string
  templateId?: string
  templateName?: string
  templateLanguage?: string
  templateVariables?: Record<string, string>
  status: CampaignStatus
  scheduledAt?: Date
  startedAt?: Date
  completedAt?: Date
  pausedAt?: Date
  totalRecipients: number
  messagesSent: number
  messagesDelivered: number
  messagesRead: number
  messagesFailed: number
  messagesReplied: number
  rateLimit: number
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

interface CampaignMessage {
  id: string
  campaignId: string
  contactId: string
  phoneNumber: string
  messageContent: string
  whatsappMessageId?: string
  status: MessageStatus
  errorMessage?: string
  sentAt?: Date
  deliveredAt?: Date
  readAt?: Date
  repliedAt?: Date
  replyContent?: string
  createdAt: Date
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Before defining the correctness properties, let me analyze each acceptance criterion for testability.



### Property Reflection

After analyzing all acceptance criteria, I've identified several areas where properties can be consolidated:

**Consolidations:**
- Properties 1.4 and 4.3 (save and retrieve) can be combined into a general "data persistence round-trip" property
- Properties 1.5 (edit/delete) covers CRUD operations that are already tested by create (1.1) and retrieve (1.4)
- Properties 7.1, 7.3, 12.4, 12.5, 12.6 all test metric calculations and can be consolidated into comprehensive statistics properties
- Properties 8.1 and 8.2 (opt-out keyword detection and marking) can be combined into one property
- Properties 9.1 and 9.5 (rate limiting) can be combined into one comprehensive rate limit property
- Properties 11.4 and 4.2 (template preview) are testing the same functionality
- Properties 12.1, 12.2, 12.3 all test status tracking and can be consolidated

**Unique Properties to Keep:**
- Segment filtering and preview (1.2, 1.3)
- Dynamic vs static segments (2.1, 2.2)
- Campaign creation and scheduling (3.1, 5.1, 5.2)
- Variable substitution (4.1)
- Batch processing (6.1)
- Error handling and retry (6.2, 10.5)
- Pause/resume (6.5)
- Opt-out filtering (8.3)
- Permission enforcement (13.1, 13.2, 13.3)
- Audit logging (9.4, 13.4)

### Correctness Properties

#### Segment Management Properties

**Property 1: Segment Creation with Criteria**
*For any* valid segment name and criteria combination (labels, workflow status, date ranges, custom fields, conversation count, rating), creating a segment should store all criteria correctly and return a segment with a unique ID.
**Validates: Requirements 1.1, 1.2**

**Property 2: Segment Preview Accuracy**
*For any* segment criteria and set of contacts, the preview count should equal the number of contacts that match all specified criteria when filtered manually.
**Validates: Requirements 1.3**

**Property 3: Segment Persistence Round-Trip**
*For any* segment, saving it to the database and then retrieving it should return a segment with identical name, description, criteria, and settings.
**Validates: Requirements 1.4**

**Property 4: Dynamic Segment Auto-Update**
*For any* dynamic segment with specific criteria, when a new contact is added that matches the criteria, refreshing the segment should increase the contact count by one.
**Validates: Requirements 2.1**

**Property 5: Static vs Dynamic Segment Behavior**
*For any* segment created as static, adding new contacts that match the criteria should not change the segment's contact count, while the same operation on a dynamic segment should update the count.
**Validates: Requirements 2.2**

**Property 6: Segment Refresh Updates Timestamp**
*For any* segment, calling refresh should update the last_refreshed_at timestamp to the current time.
**Validates: Requirements 2.3, 2.4**

#### Campaign Management Properties

**Property 7: Campaign Creation with Required Fields**
*For any* valid campaign name, segment ID, message content, and message type, creating a campaign should store all fields correctly and return a campaign with draft status and a unique ID.
**Validates: Requirements 3.1, 3.5**

**Property 8: Campaign Recipient Count Matches Segment**
*For any* campaign linked to a segment, the total_recipients count should equal the contact count of the associated segment at the time of campaign creation or refresh.
**Validates: Requirements 3.4**

**Property 9: Variable Substitution in Messages**
*For any* message template containing variables (e.g., {name}, {phone}) and a contact with those fields, substituting variables should replace all placeholders with the corresponding contact field values.
**Validates: Requirements 4.1**

**Property 10: Template Preview Rendering**
*For any* template with variables and sample data, generating a preview should produce a string where all variables are replaced with the sample values.
**Validates: Requirements 4.2, 11.4**

**Property 11: Campaign Scheduling**
*For any* campaign with a scheduled_at timestamp in the future, the campaign status should be 'scheduled' and the campaign should not execute until the scheduled time is reached.
**Validates: Requirements 5.1, 5.2**

**Property 12: Scheduled Campaign Cancellation**
*For any* scheduled campaign, calling cancel before the scheduled time should change the status to 'cancelled' and prevent execution.
**Validates: Requirements 5.3**

**Property 13: Campaign Status Filtering**
*For any* set of campaigns with various statuses, filtering by status='scheduled' should return only campaigns with that exact status.
**Validates: Requirements 5.4**

#### Campaign Execution Properties

**Property 14: Batch Processing with Rate Limiting**
*For any* campaign with N recipients and rate limit R messages/second, executing the campaign should send messages in batches such that no more than R messages are sent in any 1-second window.
**Validates: Requirements 6.1, 9.1, 9.5**

**Property 15: Message Status Tracking**
*For any* campaign message sent, the system should create a campaign_messages record with the message ID, and update its status field as status updates are received (sent → delivered → read).
**Validates: Requirements 6.3, 12.1, 12.2**

**Property 16: Failed Message Retry**
*For any* campaign message with status='failed', calling retry should attempt to resend the message and update the status based on the result.
**Validates: Requirements 6.2, 7.4**

**Property 17: Campaign Pause and Resume**
*For any* running campaign, calling pause should stop message sending and set status='paused', and calling resume should continue sending from where it stopped and set status='running'.
**Validates: Requirements 6.5**

#### Analytics Properties

**Property 18: Campaign Statistics Calculation**
*For any* campaign with N campaign_messages records, the campaign statistics (messages_sent, messages_delivered, messages_read, messages_failed) should equal the count of messages with each respective status.
**Validates: Requirements 7.1, 7.3**

**Property 19: Open Rate Calculation**
*For any* campaign, the open rate should equal (messages_read / messages_delivered) * 100, where messages_delivered > 0.
**Validates: Requirements 12.4**

**Property 20: Reply Rate Calculation**
*For any* campaign, the reply rate should equal (messages_replied / messages_delivered) * 100, where messages_delivered > 0.
**Validates: Requirements 12.5**

**Property 21: Reply Tracking**
*For any* campaign message that receives a customer reply, the system should update the replied_at timestamp and reply_content field, and increment the campaign's messages_replied count.
**Validates: Requirements 12.3**

**Property 22: Average Time-to-Reply Calculation**
*For any* campaign with messages that have both sent_at and replied_at timestamps, the average time-to-reply should equal the mean of (replied_at - sent_at) for all replied messages.
**Validates: Requirements 12.6**

**Property 23: Engagement Timeline Aggregation**
*For any* campaign with messages sent at various timestamps, grouping by hourly or daily intervals should produce timeline data where each interval's counts equal the sum of messages with timestamps in that interval.
**Validates: Requirements 12.7**

**Property 24: Campaign Report Export Completeness**
*For any* campaign, exporting the report should produce a file containing all campaign_messages records with their complete data (status, timestamps, contact info, content).
**Validates: Requirements 7.2, 12.8**

#### Opt-out Management Properties

**Property 25: Opt-out Keyword Detection**
*For any* message containing opt-out keywords (case-insensitive: "STOP", "BERHENTI", "UNSUBSCRIBE"), processing the message should mark the contact as opted_out=true and set the opted_out_at timestamp.
**Validates: Requirements 8.1, 8.2**

**Property 26: Opted-out Contact Exclusion**
*For any* campaign targeting a segment, when generating the recipient list, contacts with opted_out=true should be excluded from the campaign_messages records.
**Validates: Requirements 8.3**

**Property 27: Opt-in Round-Trip**
*For any* contact, marking them as opted-out and then opted-in should result in opted_out=false, and the contact should be included in future campaign recipient lists.
**Validates: Requirements 8.5**

#### Compliance and Rate Limiting Properties

**Property 28: Contact Cooldown Enforcement**
*For any* contact, if a campaign message was sent within the cooldown period (e.g., 24 hours), attempting to send another campaign message should be rejected or delayed until the cooldown expires.
**Validates: Requirements 9.3**

**Property 29: Campaign Size Warning Threshold**
*For any* campaign where total_recipients exceeds a configured threshold (e.g., 10,000), the system should flag the campaign as requiring review or confirmation.
**Validates: Requirements 9.2**

**Property 30: Audit Log Completeness**
*For any* campaign action (create, update, delete, execute, pause, resume, cancel), the system should create an audit log entry with the action type, user ID, timestamp, and campaign ID.
**Validates: Requirements 9.4, 13.4**

#### WhatsApp Template Properties

**Property 31: Template Sync Idempotency**
*For any* WhatsApp Business account, syncing templates multiple times should result in the same set of templates in the database, with updated last_synced_at timestamps but no duplicate records.
**Validates: Requirements 11.1**

**Property 32: Template Status Filtering**
*For any* set of templates with various statuses, filtering by status='approved' should return only templates that can be used for campaigns.
**Validates: Requirements 11.2**

**Property 33: Template Variable Validation**
*For any* template with defined variables, providing a variable set that is missing required variables or contains extra variables should fail validation with a descriptive error.
**Validates: Requirements 11.5**

**Property 34: Approved Template Usage**
*For any* campaign using a template, the template must have status='approved', otherwise campaign creation or execution should fail with an error.
**Validates: Requirements 10.2**

#### Error Handling Properties

**Property 35: WhatsApp API Error Handling**
*For any* WhatsApp API error response (rate limit, invalid number, template rejected), the system should capture the error code and message, mark the message as failed, and store the error details in the error_message field.
**Validates: Requirements 10.5**

**Property 36: API Quota Tracking**
*For any* WhatsApp Business account, querying the API should return current quota usage and limits, which should be stored and displayed to the user.
**Validates: Requirements 10.4**

#### Permission Control Properties

**Property 37: Owner-Only Campaign Creation**
*For any* user with role='owner', creating, editing, or deleting campaigns should succeed, while users with role='agent' or role='supervisor' attempting the same operations should receive a permission denied error.
**Validates: Requirements 13.1**

**Property 38: Supervisor Read-Only Access**
*For any* user with role='supervisor', viewing campaigns and analytics should succeed, while attempting to create, edit, or delete campaigns should receive a permission denied error.
**Validates: Requirements 13.2**

**Property 39: Agent Campaign Access Denial**
*For any* user with role='agent', attempting to access any campaign feature (view, create, edit, delete) should receive a permission denied error.
**Validates: Requirements 13.3**



## Error Handling

### Error Categories

#### 1. Validation Errors

**Segment Validation:**
- Empty segment name
- Invalid criteria format
- Criteria referencing non-existent labels or fields
- Response: 400 Bad Request with descriptive error message

**Campaign Validation:**
- Empty campaign name or message content
- Invalid segment ID
- Template variables missing or invalid
- Scheduled time in the past
- Invalid rate limit (< 1 or > 100)
- Response: 400 Bad Request with field-specific errors

**Template Validation:**
- Template not approved
- Missing required variables
- Invalid variable format
- Response: 400 Bad Request with validation details

#### 2. Permission Errors

**Access Control:**
- Non-owner attempting to create/edit/delete campaigns
- Agent attempting to access campaign features
- Response: 403 Forbidden with permission requirement message

**Resource Ownership:**
- User attempting to access another user's segments/campaigns
- Response: 403 Forbidden or 404 Not Found

#### 3. WhatsApp API Errors

**Rate Limiting:**
- WhatsApp API rate limit exceeded
- Action: Implement exponential backoff, queue messages for retry
- Response: Mark messages as 'pending', retry after delay

**Invalid Phone Numbers:**
- Phone number not registered on WhatsApp
- Phone number format invalid
- Action: Mark message as 'failed', log error
- Response: Update campaign_messages with error details

**Template Errors:**
- Template not found or rejected by WhatsApp
- Template variables don't match
- Action: Fail campaign execution, notify user
- Response: 400 Bad Request with template error details

**Account Issues:**
- WhatsApp Business account suspended
- API credentials invalid or expired
- Action: Pause all campaigns, notify owner
- Response: 503 Service Unavailable with account status

#### 4. System Errors

**Database Errors:**
- Connection timeout
- Constraint violations
- Action: Retry with exponential backoff, log error
- Response: 500 Internal Server Error

**Queue Errors:**
- Job processing failure
- Queue connection lost
- Action: Retry job, move to dead letter queue after max attempts
- Response: Log error, update campaign status to 'failed'

**External Service Errors:**
- Supabase Storage unavailable
- Socket.IO connection lost
- Action: Retry operation, fallback to polling
- Response: Graceful degradation, log warning

### Error Recovery Strategies

#### Automatic Retry Logic

```typescript
interface RetryConfig {
  maxAttempts: number
  initialDelay: number  // milliseconds
  maxDelay: number
  backoffMultiplier: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2
}

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error
  let delay = config.initialDelay
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      if (attempt < config.maxAttempts) {
        await sleep(delay)
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelay)
      }
    }
  }
  
  throw lastError
}
```

#### Circuit Breaker Pattern

For WhatsApp API calls, implement circuit breaker to prevent cascading failures:

```typescript
enum CircuitState {
  CLOSED = 'closed',    // Normal operation
  OPEN = 'open',        // Failing, reject requests
  HALF_OPEN = 'half_open'  // Testing if service recovered
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED
  private failureCount: number = 0
  private lastFailureTime: number = 0
  private readonly threshold: number = 5
  private readonly timeout: number = 60000  // 1 minute
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = CircuitState.HALF_OPEN
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }
    
    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }
  
  private onSuccess() {
    this.failureCount = 0
    this.state = CircuitState.CLOSED
  }
  
  private onFailure() {
    this.failureCount++
    this.lastFailureTime = Date.now()
    
    if (this.failureCount >= this.threshold) {
      this.state = CircuitState.OPEN
    }
  }
}
```

### Error Logging and Monitoring

All errors should be logged with:
- Timestamp
- Error type and message
- Stack trace
- User ID and action
- Request context (campaign ID, message ID, etc.)
- Severity level (error, warning, info)

Critical errors (API account issues, system failures) should trigger alerts to administrators.

## Testing Strategy

### Overview

The testing strategy employs a dual approach combining unit tests for specific scenarios and property-based tests for comprehensive coverage of system behaviors.

### Property-Based Testing

**Framework**: fast-check (for TypeScript/JavaScript)

**Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tag format: `Feature: campaign-segmentation, Property N: [property description]`

**Test Organization:**
```
tests/
├── properties/
│   ├── segment.properties.test.ts
│   ├── campaign.properties.test.ts
│   ├── execution.properties.test.ts
│   ├── analytics.properties.test.ts
│   ├── optout.properties.test.ts
│   ├── templates.properties.test.ts
│   └── permissions.properties.test.ts
├── unit/
│   ├── segment.service.test.ts
│   ├── campaign.service.test.ts
│   ├── whatsapp-client.test.ts
│   └── analytics.service.test.ts
└── integration/
    ├── campaign-flow.test.ts
    └── webhook-handling.test.ts
```

### Property Test Examples

**Example 1: Segment Preview Accuracy (Property 2)**
```typescript
// Feature: campaign-segmentation, Property 2: Segment preview count matches filtered contacts
test('segment preview accuracy', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(contactArbitrary(), { minLength: 0, maxLength: 100 }),
      fc.record({
        labels: fc.option(fc.array(fc.uuid())),
        workflowStatus: fc.option(fc.array(fc.constantFrom('incoming', 'in_progress', 'resolved'))),
        conversationCount: fc.option(fc.record({
          min: fc.nat(100),
          max: fc.nat(100)
        }))
      }),
      async (contacts, criteria) => {
        // Setup: Insert contacts into test database
        await insertTestContacts(contacts)
        
        // Execute: Get preview count
        const preview = await segmentService.previewSegment(criteria)
        
        // Verify: Manual filter should match preview count
        const manuallyFiltered = contacts.filter(c => matchesCriteria(c, criteria))
        expect(preview.count).toBe(manuallyFiltered.length)
        
        // Cleanup
        await cleanupTestContacts()
      }
    ),
    { numRuns: 100 }
  )
})
```

**Example 2: Variable Substitution (Property 9)**
```typescript
// Feature: campaign-segmentation, Property 9: Variable substitution replaces all placeholders
test('variable substitution in messages', () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 1, maxLength: 50 }),  // name
      fc.string({ minLength: 10, maxLength: 15 }),  // phone
      fc.record({
        customField1: fc.string(),
        customField2: fc.nat()
      }),
      (name, phone, customFields) => {
        const template = 'Hello {name}, your phone is {phone}. Field: {customField1}'
        const contact = { name, phone, metadata: customFields }
        
        const result = substituteVariables(template, contact)
        
        // Verify all variables are replaced
        expect(result).toContain(name)
        expect(result).toContain(phone)
        expect(result).toContain(customFields.customField1)
        expect(result).not.toContain('{name}')
        expect(result).not.toContain('{phone}')
      }
    ),
    { numRuns: 100 }
  )
})
```

**Example 3: Rate Limiting (Property 14)**
```typescript
// Feature: campaign-segmentation, Property 14: Batch processing respects rate limits
test('batch processing with rate limiting', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.integer({ min: 10, max: 100 }),  // recipient count
      fc.integer({ min: 5, max: 20 }),    // rate limit (msg/sec)
      async (recipientCount, rateLimit) => {
        // Setup: Create campaign with recipients
        const campaign = await createTestCampaign({
          recipientCount,
          rateLimit
        })
        
        // Execute: Start campaign execution
        const startTime = Date.now()
        await campaignExecutionService.startExecution(campaign.id)
        const endTime = Date.now()
        
        // Verify: Execution time should respect rate limit
        const expectedMinTime = (recipientCount / rateLimit) * 1000
        const actualTime = endTime - startTime
        
        // Allow 10% tolerance for processing overhead
        expect(actualTime).toBeGreaterThanOrEqual(expectedMinTime * 0.9)
        
        // Verify: All messages sent
        const messages = await getCampaignMessages(campaign.id)
        expect(messages.filter(m => m.status === 'sent').length).toBe(recipientCount)
        
        // Cleanup
        await cleanupTestCampaign(campaign.id)
      }
    ),
    { numRuns: 50 }  // Fewer runs due to time-intensive test
  )
})
```

### Unit Testing

Unit tests focus on:
- Edge cases (empty inputs, boundary values)
- Error conditions (invalid data, API failures)
- Specific business logic (opt-out keyword detection, metric calculations)
- Integration points (WhatsApp API client, database operations)

**Example Unit Tests:**

```typescript
describe('OptOutService', () => {
  test('detects STOP keyword case-insensitive', async () => {
    const keywords = ['STOP', 'stop', 'Stop', 'BERHENTI', 'berhenti']
    
    for (const keyword of keywords) {
      const result = await optOutService.processOptOutKeyword(keyword, contactId)
      expect(result).toBe(true)
      
      const preference = await getContactPreference(contactId)
      expect(preference.optedOut).toBe(true)
    }
  })
  
  test('ignores non-opt-out messages', async () => {
    const messages = ['Hello', 'Thanks', 'Yes please', 'STOPPING by later']
    
    for (const message of messages) {
      const result = await optOutService.processOptOutKeyword(message, contactId)
      expect(result).toBe(false)
    }
  })
  
  test('handles empty or whitespace messages', async () => {
    const messages = ['', '   ', '\n', '\t']
    
    for (const message of messages) {
      const result = await optOutService.processOptOutKeyword(message, contactId)
      expect(result).toBe(false)
    }
  })
})

describe('AnalyticsService', () => {
  test('calculates open rate correctly', async () => {
    const campaign = await createTestCampaign()
    await createCampaignMessages(campaign.id, [
      { status: 'delivered' },
      { status: 'delivered' },
      { status: 'read' },
      { status: 'read' },
      { status: 'read' }
    ])
    
    const stats = await analyticsService.getCampaignStats(campaign.id)
    
    // 3 read out of 5 delivered = 60%
    expect(stats.openRate).toBe(60)
  })
  
  test('handles zero delivered messages', async () => {
    const campaign = await createTestCampaign()
    await createCampaignMessages(campaign.id, [
      { status: 'pending' },
      { status: 'failed' }
    ])
    
    const stats = await analyticsService.getCampaignStats(campaign.id)
    
    expect(stats.openRate).toBe(0)
    expect(stats.replyRate).toBe(0)
  })
})
```

### Integration Testing

Integration tests verify:
- Complete campaign flow (create → schedule → execute → track)
- Webhook handling from WhatsApp
- Real-time updates via Socket.IO
- Database transactions and consistency

**Example Integration Test:**

```typescript
describe('Campaign Flow Integration', () => {
  test('complete campaign lifecycle', async () => {
    // 1. Create segment
    const segment = await segmentService.createSegment({
      name: 'Test Segment',
      criteria: { labels: [testLabelId] },
      isDynamic: true,
      userId: ownerId
    })
    
    // 2. Create campaign
    const campaign = await campaignService.createCampaign({
      name: 'Test Campaign',
      segmentId: segment.id,
      messageContent: 'Hello {name}',
      messageType: 'text',
      userId: ownerId
    })
    
    expect(campaign.status).toBe('draft')
    expect(campaign.totalRecipients).toBeGreaterThan(0)
    
    // 3. Execute campaign
    await campaignService.executeCampaign(campaign.id)
    
    // 4. Verify messages created
    const messages = await getCampaignMessages(campaign.id)
    expect(messages.length).toBe(campaign.totalRecipients)
    expect(messages.every(m => m.status === 'sent')).toBe(true)
    
    // 5. Simulate webhook status update
    await webhookHandler.handleStatusUpdate({
      messageId: messages[0].whatsappMessageId,
      status: 'delivered'
    })
    
    // 6. Verify status updated
    const updatedMessage = await getCampaignMessage(messages[0].id)
    expect(updatedMessage.status).toBe('delivered')
    
    // 7. Verify campaign stats updated
    const stats = await analyticsService.getCampaignStats(campaign.id)
    expect(stats.messagesDelivered).toBe(1)
  })
})
```

### Test Data Generators (Arbitraries)

For property-based testing, define custom arbitraries:

```typescript
import * as fc from 'fast-check'

// Contact arbitrary
const contactArbitrary = () => fc.record({
  id: fc.uuid(),
  userId: fc.uuid(),
  phoneNumber: fc.string({ minLength: 10, maxLength: 15 }).map(s => '+' + s.replace(/\D/g, '')),
  name: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  metadata: fc.record({
    conversationCount: fc.nat(100),
    rating: fc.option(fc.integer({ min: 1, max: 5 })),
    customFields: fc.dictionary(fc.string(), fc.anything())
  }),
  labels: fc.array(fc.uuid(), { maxLength: 5 }),
  workflowStatus: fc.constantFrom('incoming', 'in_progress', 'resolved', 'done')
})

// Segment criteria arbitrary
const segmentCriteriaArbitrary = () => fc.record({
  labels: fc.option(fc.array(fc.uuid(), { minLength: 1, maxLength: 3 })),
  workflowStatus: fc.option(fc.array(fc.constantFrom('incoming', 'in_progress', 'resolved'))),
  lastInteractionDateRange: fc.option(fc.record({
    start: fc.date(),
    end: fc.date()
  })),
  conversationCount: fc.option(fc.record({
    min: fc.nat(50),
    max: fc.nat(50).map(n => n + 50)
  }))
})

// Campaign arbitrary
const campaignArbitrary = () => fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }),
  messageContent: fc.string({ minLength: 1, maxLength: 1000 }),
  messageType: fc.constantFrom('text', 'template'),
  rateLimit: fc.integer({ min: 1, max: 50 }),
  status: fc.constantFrom('draft', 'scheduled', 'running', 'completed')
})
```

### Test Coverage Goals

- **Unit Tests**: 80%+ code coverage
- **Property Tests**: All 39 correctness properties implemented
- **Integration Tests**: All critical user flows covered
- **Performance Tests**: Campaign execution with 10,000+ contacts
- **Load Tests**: 5+ concurrent campaigns

### Continuous Integration

All tests should run on:
- Every pull request
- Before deployment
- Nightly for extended property test runs (1000+ iterations)

Property tests with failures should:
- Log the failing input for reproduction
- Create a regression unit test with the failing case
- Block deployment until fixed

