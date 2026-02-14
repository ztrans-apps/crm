# Implementation Plan: Campaign Segmentation & Broadcast System

## Overview

This implementation plan breaks down the Campaign Segmentation & Broadcast System into incremental, testable tasks. The system will be built using TypeScript, Next.js, Supabase, and WhatsApp Business API integration. Each task builds on previous work, with property-based tests integrated throughout to ensure correctness.

## Tasks

- [x] 1. Database Schema and Migrations
  - Create Supabase migrations for all new tables (segments, campaigns, campaign_messages, contact_preferences, whatsapp_templates)
  - Add indexes for performance optimization
  - Create database functions for permission checks if needed
  - _Requirements: All database requirements from design document_

- [x] 2. Core Type Definitions and Interfaces
  - Create TypeScript types for all data models (Segment, Campaign, CampaignMessage, WhatsAppTemplate, etc.)
  - Define service interfaces (SegmentService, CampaignService, etc.)
  - Create enums for statuses (CampaignStatus, MessageStatus, TemplateStatus)
  - Add types to types/database.types.ts
  - _Requirements: Data Models section from design_

- [ ] 3. Segment Service Implementation
  - [x] 3.1 Implement segment CRUD operations
    - Create lib/services/segment.service.ts
    - Implement createSegment, updateSegment, deleteSegment, getSegment, listSegments
    - _Requirements: 1.1, 1.4, 1.5, 1.6_
  
  - [x] 3.2 Write property test for segment persistence
    - **Property 3: Segment Persistence Round-Trip**
    - **Validates: Requirements 1.4**
  
  - [x] 3.3 Implement segment preview and filtering logic
    - Implement previewSegment with criteria filtering
    - Support all filter types: labels, workflow status, date ranges, custom fields, conversation count, rating
    - _Requirements: 1.2, 1.3_
  
  - [ ] 3.4 Write property test for segment preview accuracy
    - **Property 2: Segment Preview Accuracy**
    - **Validates: Requirements 1.3**
  
  - [ ] 3.5 Implement dynamic segment refresh
    - Implement refreshSegment to recalculate contact counts
    - Update last_refreshed_at timestamp
    - _Requirements: 2.1, 2.3, 2.4_
  
  - [ ] 3.6 Write property test for dynamic segment behavior
    - **Property 4: Dynamic Segment Auto-Update**
    - **Property 5: Static vs Dynamic Segment Behavior**
    - **Validates: Requirements 2.1, 2.2**

- [ ] 4. Campaign Service Implementation
  - [ ] 4.1 Implement campaign CRUD operations
    - Create lib/services/campaign.service.ts
    - Implement createCampaign, updateCampaign, deleteCampaign, getCampaign, listCampaigns
    - Calculate total_recipients from segment
    - _Requirements: 3.1, 3.4, 3.5_
  
  - [ ] 4.2 Write property test for campaign creation
    - **Property 7: Campaign Creation with Required Fields**
    - **Property 8: Campaign Recipient Count Matches Segment**
    - **Validates: Requirements 3.1, 3.4, 3.5**
  
  - [ ] 4.3 Implement variable substitution logic
    - Create utility function for replacing {variable} placeholders
    - Support contact fields: name, phone, custom metadata fields
    - _Requirements: 4.1_
  
  - [ ] 4.4 Write property test for variable substitution
    - **Property 9: Variable Substitution in Messages**
    - **Validates: Requirements 4.1**
  
  - [ ] 4.5 Implement campaign scheduling
    - Implement scheduleCampaign, cancelCampaign
    - Validate scheduled_at is in the future
    - Update campaign status appropriately
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ] 4.6 Write property test for campaign scheduling
    - **Property 11: Campaign Scheduling**
    - **Property 12: Scheduled Campaign Cancellation**
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [ ] 5. WhatsApp Business API Client
  - [ ] 5.1 Create WhatsApp Business API client wrapper
    - Create lib/services/whatsapp-business-client.ts
    - Implement sendTemplateMessage method
    - Implement getTemplates method
    - Implement getAccountInfo method
    - Add authentication with API credentials
    - _Requirements: 10.1, 10.2_
  
  - [ ] 5.2 Implement error handling and retry logic
    - Add retry with exponential backoff for transient errors
    - Implement circuit breaker pattern for API calls
    - Handle rate limiting errors
    - _Requirements: 6.2, 10.5_
  
  - [ ] 5.3 Write property test for API error handling
    - **Property 35: WhatsApp API Error Handling**
    - **Validates: Requirements 10.5**

- [ ] 6. WhatsApp Template Service
  - [ ] 6.1 Implement template sync from WhatsApp Business Manager
    - Create lib/services/whatsapp-template.service.ts
    - Implement syncTemplates to fetch and store templates
    - Handle template status (approved, pending, rejected)
    - Prevent duplicate templates (use unique constraint)
    - _Requirements: 11.1, 11.2_
  
  - [ ] 6.2 Write property test for template sync idempotency
    - **Property 31: Template Sync Idempotency**
    - **Validates: Requirements 11.1**
  
  - [ ] 6.3 Implement template preview and validation
    - Implement previewTemplate with variable substitution
    - Implement validateTemplateVariables
    - _Requirements: 11.4, 11.5_
  
  - [ ] 6.4 Write property test for template validation
    - **Property 33: Template Variable Validation**
    - **Validates: Requirements 11.5**

- [ ] 7. Campaign Execution Service
  - [ ] 7.1 Implement campaign execution engine
    - Create lib/services/campaign-execution.service.ts
    - Implement startExecution to begin campaign
    - Create campaign_messages records for all recipients
    - Exclude opted-out contacts
    - _Requirements: 6.1, 8.3_
  
  - [ ] 7.2 Implement batch processing with rate limiting
    - Implement processBatch to send messages in batches
    - Respect rate_limit configuration (messages per second)
    - Use queue system for background processing
    - _Requirements: 6.1, 9.1, 9.5_
  
  - [ ] 7.3 Write property test for rate limiting
    - **Property 14: Batch Processing with Rate Limiting**
    - **Validates: Requirements 6.1, 9.1, 9.5**
  
  - [ ] 7.4 Implement pause and resume functionality
    - Implement pauseCampaign and resumeCampaign
    - Track paused_at timestamp
    - Resume from where campaign was paused
    - _Requirements: 6.5_
  
  - [ ] 7.5 Write property test for pause/resume
    - **Property 17: Campaign Pause and Resume**
    - **Validates: Requirements 6.5**
  
  - [ ] 7.6 Implement message status tracking
    - Update campaign_messages status as messages are sent
    - Track sent_at, delivered_at, read_at timestamps
    - Update campaign aggregate counts
    - _Requirements: 6.3, 12.1, 12.2_
  
  - [ ] 7.7 Write property test for message status tracking
    - **Property 15: Message Status Tracking**
    - **Validates: Requirements 6.3, 12.1, 12.2**
  
  - [ ] 7.8 Implement failed message retry
    - Implement retryFailed to resend failed messages
    - Support retrying specific messages or all failed messages
    - _Requirements: 6.2, 7.4_
  
  - [ ] 7.9 Write property test for message retry
    - **Property 16: Failed Message Retry**
    - **Validates: Requirements 6.2, 7.4**

- [ ] 8. Checkpoint - Core Services Complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Webhook Handler for WhatsApp Status Updates
  - [ ] 9.1 Create webhook endpoint for WhatsApp callbacks
    - Create app/api/webhooks/whatsapp/route.ts
    - Verify webhook signature for security
    - Parse webhook payload (status updates, incoming messages)
    - _Requirements: 12.1, 12.2_
  
  - [ ] 9.2 Implement status update processing
    - Update campaign_messages status based on webhook data
    - Update campaign aggregate statistics
    - Emit Socket.IO events for real-time UI updates
    - _Requirements: 12.1, 12.2_
  
  - [ ] 9.3 Implement reply tracking
    - Detect customer replies to campaign messages
    - Update replied_at and reply_content fields
    - Increment campaign messages_replied count
    - _Requirements: 12.3_
  
  - [ ] 9.4 Write property test for reply tracking
    - **Property 21: Reply Tracking**
    - **Validates: Requirements 12.3**

- [ ] 10. Opt-out Management Service
  - [ ] 10.1 Implement opt-out keyword detection
    - Create lib/services/optout.service.ts
    - Implement processOptOutKeyword to detect keywords (STOP, BERHENTI, UNSUBSCRIBE)
    - Case-insensitive matching
    - _Requirements: 8.1_
  
  - [ ] 10.2 Implement opt-out/opt-in operations
    - Implement optOut to mark contact as opted out
    - Implement optIn to opt contact back in
    - Implement isOptedOut check
    - Update contact_preferences table
    - _Requirements: 8.2, 8.5_
  
  - [ ] 10.3 Write property test for opt-out keyword detection
    - **Property 25: Opt-out Keyword Detection**
    - **Validates: Requirements 8.1, 8.2**
  
  - [ ] 10.4 Write property test for opt-out filtering
    - **Property 26: Opted-out Contact Exclusion**
    - **Validates: Requirements 8.3**
  
  - [ ] 10.5 Write property test for opt-in round-trip
    - **Property 27: Opt-in Round-Trip**
    - **Validates: Requirements 8.5**

- [ ] 11. Analytics Service
  - [ ] 11.1 Implement campaign statistics calculation
    - Create lib/services/analytics.service.ts
    - Implement getCampaignStats to aggregate message statuses
    - Calculate open rate, reply rate, opt-out rate
    - _Requirements: 7.1, 12.4, 12.5_
  
  - [ ] 11.2 Write property tests for statistics calculation
    - **Property 18: Campaign Statistics Calculation**
    - **Property 19: Open Rate Calculation**
    - **Property 20: Reply Rate Calculation**
    - **Validates: Requirements 7.1, 12.4, 12.5**
  
  - [ ] 11.3 Implement time-to-reply calculation
    - Calculate average time between sent_at and replied_at
    - Handle cases with no replies
    - _Requirements: 12.6_
  
  - [ ] 11.4 Write property test for time-to-reply
    - **Property 22: Average Time-to-Reply Calculation**
    - **Validates: Requirements 12.6**
  
  - [ ] 11.5 Implement engagement timeline
    - Implement getEngagementTimeline with hourly/daily grouping
    - Aggregate sent, delivered, read, replied counts by time interval
    - _Requirements: 12.7_
  
  - [ ] 11.6 Write property test for timeline aggregation
    - **Property 23: Engagement Timeline Aggregation**
    - **Validates: Requirements 12.7**
  
  - [ ] 11.7 Implement campaign report export
    - Implement exportReport to generate CSV/JSON
    - Include all campaign_messages with complete data
    - _Requirements: 7.2, 12.8_
  
  - [ ] 11.8 Write property test for export completeness
    - **Property 24: Campaign Report Export Completeness**
    - **Validates: Requirements 7.2, 12.8**

- [ ] 12. Permission and Access Control
  - [ ] 12.1 Implement permission middleware
    - Create lib/rbac/campaign-permissions.ts
    - Check user role for campaign operations
    - Owner: full access, Supervisor: read-only, Agent: no access
    - _Requirements: 13.1, 13.2, 13.3_
  
  - [ ] 12.2 Write property tests for permission enforcement
    - **Property 37: Owner-Only Campaign Creation**
    - **Property 38: Supervisor Read-Only Access**
    - **Property 39: Agent Campaign Access Denial**
    - **Validates: Requirements 13.1, 13.2, 13.3**
  
  - [ ] 12.3 Implement audit logging
    - Log all campaign actions (create, update, delete, execute, pause, resume, cancel)
    - Include user ID, timestamp, action type, campaign ID
    - _Requirements: 9.4, 13.4_
  
  - [ ] 12.4 Write property test for audit log completeness
    - **Property 30: Audit Log Completeness**
    - **Validates: Requirements 9.4, 13.4**

- [ ] 13. Checkpoint - Backend Services Complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. API Routes - Segments
  - [ ] 14.1 Create segment API endpoints
    - Create app/api/segments/route.ts (GET, POST)
    - Create app/api/segments/[id]/route.ts (GET, PUT, DELETE)
    - Create app/api/segments/[id]/preview/route.ts (POST)
    - Create app/api/segments/[id]/refresh/route.ts (POST)
    - Add permission checks (owner only)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.3_
  
  - [ ] 14.2 Write unit tests for segment API endpoints
    - Test CRUD operations
    - Test permission enforcement
    - Test error handling

- [ ] 15. API Routes - Campaigns
  - [ ] 15.1 Create campaign API endpoints
    - Create app/api/campaigns/route.ts (GET, POST)
    - Create app/api/campaigns/[id]/route.ts (GET, PUT, DELETE)
    - Create app/api/campaigns/[id]/send/route.ts (POST)
    - Create app/api/campaigns/[id]/schedule/route.ts (POST)
    - Create app/api/campaigns/[id]/cancel/route.ts (POST)
    - Create app/api/campaigns/[id]/pause/route.ts (POST)
    - Create app/api/campaigns/[id]/resume/route.ts (POST)
    - Add permission checks (owner only for mutations)
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 5.1, 5.3, 6.5_
  
  - [ ] 15.2 Write unit tests for campaign API endpoints
    - Test CRUD operations
    - Test campaign execution flow
    - Test permission enforcement

- [ ] 16. API Routes - Analytics and Templates
  - [ ] 16.1 Create analytics API endpoints
    - Create app/api/campaigns/[id]/analytics/route.ts (GET)
    - Create app/api/campaigns/[id]/messages/route.ts (GET)
    - Create app/api/campaigns/[id]/tracking/route.ts (GET)
    - Create app/api/campaigns/[id]/engagement/route.ts (GET)
    - Create app/api/campaigns/[id]/timeline/route.ts (GET)
    - Create app/api/campaigns/[id]/replies/route.ts (GET)
    - _Requirements: 7.1, 7.3, 12.4, 12.5, 12.6, 12.7_
  
  - [ ] 16.2 Create template API endpoints
    - Create app/api/whatsapp/templates/route.ts (GET)
    - Create app/api/whatsapp/templates/sync/route.ts (POST)
    - Create app/api/whatsapp/templates/[id]/route.ts (GET)
    - Create app/api/whatsapp/templates/[id]/preview/route.ts (POST)
    - _Requirements: 11.1, 11.2, 11.4_
  
  - [ ] 16.3 Write unit tests for analytics and template APIs
    - Test metric calculations
    - Test template sync
    - Test permission enforcement

- [ ] 17. Frontend - Segments Page
  - [ ] 17.1 Create segments list page
    - Create app/(app)/segments/page.tsx
    - Display all segments with statistics (name, contact count, last updated)
    - Add create segment button
    - Add edit/delete actions
    - _Requirements: 1.6_
  
  - [ ] 17.2 Create segment form modal
    - Create components for segment creation/editing
    - Form fields: name, description, criteria (labels, workflow status, date ranges, etc.)
    - Show preview count as criteria changes
    - Support dynamic vs static toggle
    - _Requirements: 1.1, 1.2, 1.3, 2.2_
  
  - [ ] 17.3 Implement segment preview
    - Show contact count matching criteria
    - Display sample contacts (first 10)
    - Update preview in real-time as criteria changes
    - _Requirements: 1.3_

- [ ] 18. Frontend - Campaigns Page
  - [ ] 18.1 Create campaigns list page
    - Create app/(app)/campaigns/page.tsx
    - Display all campaigns with status badges
    - Show key metrics (recipients, sent, delivered, read)
    - Add create campaign button
    - Filter by status (draft, scheduled, running, completed)
    - _Requirements: 3.1, 5.4_
  
  - [ ] 18.2 Create campaign builder wizard
    - Create app/(app)/campaigns/new/page.tsx
    - Step 1: Select segment
    - Step 2: Compose message (text or template)
    - Step 3: Schedule (now or later)
    - Step 4: Review and send
    - Show recipient count estimate
    - _Requirements: 3.1, 3.2, 3.4, 5.1_
  
  - [ ] 18.3 Implement message composer
    - Text editor with variable insertion ({name}, {phone}, custom fields)
    - Template selector with preview
    - Media upload support
    - Preview with sample data
    - _Requirements: 4.1, 4.2, 4.4_
  
  - [ ] 18.4 Implement campaign scheduling
    - Date/time picker
    - Timezone selector
    - Schedule or send now options
    - _Requirements: 5.1, 5.2_

- [ ] 19. Frontend - Campaign Analytics Dashboard
  - [ ] 19.1 Create campaign analytics page
    - Create app/(app)/campaigns/[id]/analytics/page.tsx
    - Display campaign overview (name, status, dates)
    - Show key metrics cards (sent, delivered, read, failed, replied)
    - Display open rate, reply rate, engagement rate
    - _Requirements: 7.1, 12.4, 12.5_
  
  - [ ] 19.2 Implement engagement timeline chart
    - Line chart showing sent/delivered/read/replied over time
    - Support hourly and daily views
    - Use charting library (e.g., recharts)
    - _Requirements: 12.7_
  
  - [ ] 19.3 Implement message status table
    - Table showing individual message statuses
    - Columns: contact, phone, status, sent time, delivered time, read time
    - Filter by status
    - Pagination support
    - _Requirements: 7.3_
  
  - [ ] 19.4 Implement customer replies view
    - List all customer replies to campaign
    - Show contact name, reply content, reply time
    - Link to conversation
    - _Requirements: 12.3_
  
  - [ ] 19.5 Implement export functionality
    - Export button to download campaign report
    - Support CSV and JSON formats
    - Include all message data
    - _Requirements: 7.2, 12.8_

- [ ] 20. Frontend - WhatsApp Templates Page
  - [ ] 20.1 Create templates list page
    - Create app/(app)/whatsapp/templates/page.tsx
    - Display all approved templates
    - Show template name, language, category, status
    - Add sync button to fetch from WhatsApp Business Manager
    - _Requirements: 11.1, 11.2_
  
  - [ ] 20.2 Implement template preview modal
    - Show template structure (header, body, footer, buttons)
    - Display variables
    - Preview with sample data
    - _Requirements: 11.4_
  
  - [ ] 20.3 Add link to WhatsApp Business Manager
    - Button to open WhatsApp Business Manager for new template requests
    - _Requirements: 11.6_

- [ ] 21. Real-time Updates with Socket.IO
  - [ ] 21.1 Implement Socket.IO events for campaign updates
    - Emit campaign status changes (running, paused, completed)
    - Emit message status updates (sent, delivered, read)
    - Emit progress updates during execution
    - _Requirements: 6.4_
  
  - [ ] 21.2 Update frontend to listen for Socket.IO events
    - Subscribe to campaign events on analytics page
    - Update UI in real-time as statuses change
    - Show progress bar during campaign execution
    - _Requirements: 6.4_

- [ ] 22. Background Job Scheduler
  - [ ] 22.1 Implement scheduled campaign job
    - Create background job to check for scheduled campaigns
    - Execute campaigns when scheduled_at time is reached
    - Run every minute to check for due campaigns
    - _Requirements: 5.1, 5.5_
  
  - [ ] 22.2 Implement campaign execution queue
    - Use job queue for processing campaign batches
    - Handle job failures and retries
    - Implement dead letter queue for failed jobs
    - _Requirements: 6.1, 6.2_

- [ ] 23. Compliance and Rate Limiting Features
  - [ ] 23.1 Write property test for contact cooldown
    - **Property 28: Contact Cooldown Enforcement**
    - **Validates: Requirements 9.3**
  
  - [ ] 23.2 Implement campaign size warning
    - Check total_recipients against threshold
    - Show warning in UI for large campaigns
    - _Requirements: 9.2_
  
  - [ ] 23.3 Write property test for campaign size warning
    - **Property 29: Campaign Size Warning Threshold**
    - **Validates: Requirements 9.2**

- [ ] 24. Final Integration and Testing
  - [ ] 24.1 Write integration tests for complete campaign flow
    - Test end-to-end: create segment → create campaign → execute → track → analyze
    - Test webhook handling
    - Test real-time updates
  
  - [ ] 24.2 Performance testing
    - Test campaign execution with 10,000+ contacts
    - Test concurrent campaign execution (5+ campaigns)
    - Verify rate limiting works under load
    - _Requirements: Performance requirements_
  
  - [ ] 24.3 Security testing
    - Test permission enforcement across all endpoints
    - Test webhook signature verification
    - Test SQL injection prevention
    - Test XSS prevention in UI

- [ ] 25. Final Checkpoint - Complete System
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 26. Documentation and Deployment
  - [ ] 26.1 Create user documentation
    - How to create segments
    - How to create and schedule campaigns
    - How to use WhatsApp templates
    - How to interpret analytics
  
  - [ ] 26.2 Create developer documentation
    - API endpoint documentation
    - Service architecture overview
    - Database schema documentation
    - Webhook integration guide
  
  - [ ] 26.3 Deployment preparation
    - Environment variables configuration
    - WhatsApp Business API credentials setup
    - Database migration execution
    - Background job scheduler setup

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at major milestones
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples, edge cases, and error conditions
- Integration tests validate end-to-end flows and external integrations
- The implementation follows a bottom-up approach: database → services → APIs → frontend
- Real-time features (Socket.IO) and background jobs are implemented after core functionality
- Security and compliance features are integrated throughout, with final validation at the end
