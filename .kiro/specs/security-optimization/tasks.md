# Implementation Plan: Security and Optimization for WhatsApp CRM

## Overview

This implementation plan transforms the WhatsApp CRM system through comprehensive security hardening and architectural optimization. The plan is organized into 5 phases over 10 weeks, implementing defense-in-depth security, layered architecture (Middleware → Service → Repository), and performance optimizations while maintaining backward compatibility.

**Technology Stack**: Next.js 13+ (App Router), TypeScript, Supabase PostgreSQL, Redis (Upstash), Zod validation, fast-check property testing, Vitest unit testing

**Key Constraints**:
- Maintain backward compatibility during migration
- No breaking changes to existing APIs
- Multi-tenant isolation enforced at all layers
- Minimum 80% code coverage (100% for security paths)
- All 40 requirements and 49 correctness properties must be addressed

## Phase 1: Foundation (Weeks 1-2)

### 1. Core Security Infrastructure Setup

- [x] 1.1 Create base middleware infrastructure
  - Create `lib/middleware/types.ts` with shared TypeScript interfaces for middleware components
  - Define `WithAuthOptions`, `AuthContext`, `RateLimitConfig`, `ValidationResult` interfaces
  - _Requirements: 2.6, 2.7, 3.1, 1.1_

- [x] 1.2 Implement enhanced withAuth middleware
  - Extend existing `lib/rbac/with-auth.ts` to support rate limiting and input validation options
  - Integrate session validation, permission checking, and context injection
  - Add support for `validation` option to accept Zod schemas for body/query/params
  - Add support for `rateLimit` option with configurable limits
  - _Requirements: 2.1, 2.2, 2.5, 2.6, 2.7_

- [x] 1.3 Write property test for authentication requirement
  - **Property 6: Authentication Requirement**
  - **Validates: Requirements 2.1**
  - Test that unauthenticated requests to protected endpoints return 401

- [x] 1.4 Write property test for permission-based authorization
  - **Property 8: Permission-Based Authorization**
  - **Validates: Requirements 2.5, 2.9**
  - Test that users without required permissions receive 403 status


### 2. Input Validation Layer

- [x] 2.1 Create validation schema infrastructure
  - Create `lib/validation/schemas.ts` with Zod schemas for all API inputs
  - Implement `CreateContactSchema`, `UpdateContactSchema`, `SendMessageSchema`, `CreateBroadcastSchema`
  - Implement `FileUploadSchema` with MIME type and size validation
  - Add phone number validation regex and email validation
  - _Requirements: 1.1, 1.7, 1.8, 1.10_

- [x] 2.2 Implement input validator utility
  - Create `lib/middleware/input-validator.ts` with `InputValidator` class
  - Implement `validate()` method that returns `ValidationResult<T>`
  - Implement `sanitizeString()`, `sanitizeHtml()`, `validatePhoneNumber()`, `validateEmail()` methods
  - _Requirements: 1.2, 1.3, 1.4, 1.9_

- [x] 2.3 Write property test for input validation rejection
  - **Property 1: Input Validation Rejection**
  - **Validates: Requirements 1.2, 1.3, 1.4, 1.5**
  - Test that invalid inputs are rejected with 400 status and sanitized errors

- [x] 2.4 Write property test for phone number validation
  - **Property 2: Phone Number Format Validation**
  - **Validates: Requirements 1.7**
  - Test that only E.164 format phone numbers are accepted

- [x] 2.5 Write property test for string sanitization
  - **Property 4: String Sanitization**
  - **Validates: Requirements 1.9, 26.4, 26.7, 27.1-27.4, 27.8, 27.9**
  - Test that SQL injection, XSS, and path traversal payloads are sanitized


### 3. Rate Limiting Infrastructure

- [x] 3.1 Implement Redis-based rate limiter
  - Create `lib/middleware/rate-limiter.ts` with `RateLimiter` class
  - Implement sliding window algorithm using Redis sorted sets
  - Implement `checkLimit()`, `incrementCounter()`, `resetLimit()` methods
  - Add graceful degradation to in-memory rate limiting when Redis unavailable
  - _Requirements: 3.1, 3.2, 3.5, 3.6, 24.2_

- [x] 3.2 Configure rate limit tiers
  - Define rate limit configurations for different endpoint categories
  - Authentication endpoints: 5 requests/minute per IP
  - WhatsApp message sending: 100 requests/hour per tenant
  - Standard API endpoints: 1000 requests/hour per tenant
  - Admin endpoints: 500 requests/hour per user
  - _Requirements: 3.6, 3.7, 3.8, 3.9_

- [x] 3.3 Integrate rate limiter with withAuth middleware
  - Add rate limit checking before request processing
  - Return 429 status with Retry-After header when limit exceeded
  - Add rate limit headers (X-RateLimit-*) to all responses
  - _Requirements: 3.3, 3.4, 3.10_

- [x] 3.4 Write property test for rate limiting enforcement
  - **Property 12: Rate Limiting Enforcement**
  - **Validates: Requirements 3.1, 3.6**
  - Test that requests exceeding limits are rejected with 429 status

- [x] 3.5 Write property test for rate limit headers
  - **Property 13: Rate Limit Headers**
  - **Validates: Requirements 3.4, 3.10**
  - Test that all responses include correct rate limit headers


### 4. Error Handling and Logging

- [x] 4.1 Create centralized error handler
  - Create `lib/middleware/error-handler.ts` with `ErrorHandler` class and custom error types
  - Implement `AppError`, `ValidationError`, `AuthenticationError`, `AuthorizationError`, `RateLimitError`, `NotFoundError`, `ConflictError`
  - Implement `handle()`, `sanitizeError()`, `logError()` methods
  - Define error codes (AUTH_001, AUTHZ_001, VAL_001, RATE_001, DB_001, EXT_001)
  - _Requirements: 7.1, 7.2, 7.4, 7.8_

- [x] 4.2 Implement error sanitization
  - Ensure error messages never expose database schema, file paths, environment variables
  - Include error type, user-friendly message, error code, request ID, timestamp
  - Integrate with Sentry for error tracking
  - _Requirements: 7.2, 7.3, 7.5, 7.6, 7.7, 7.9, 7.10_

- [x] 4.3 Write property test for error message sanitization
  - **Property 24: Error Message Sanitization**
  - **Validates: Requirements 7.2, 7.5, 7.6, 7.7**
  - Test that error responses never contain internal system details

- [x] 4.4 Write property test for error status codes
  - **Property 25: Error Status Codes**
  - **Validates: Requirements 7.4**
  - Test that each error type returns appropriate HTTP status code

- [x] 4.5 Implement request logger
  - Create `lib/middleware/request-logger.ts` with `RequestLogger` class
  - Log all requests with method, path, query, userId, tenantId, IP, user agent, status, duration
  - Log authentication failures, authorization failures, rate limit violations
  - Never log sensitive data (passwords, tokens, API keys)
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9, 14.10_


### 5. Security Headers and CORS

- [x] 5.1 Implement security headers middleware
  - Create `lib/middleware/security-headers.ts` with `addSecurityHeaders()` function
  - Add X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Strict-Transport-Security
  - Add Content-Security-Policy, Referrer-Policy, Permissions-Policy headers
  - Remove X-Powered-By header
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.10_

- [x] 5.2 Configure CORS handling
  - Update Next.js middleware to handle CORS with origin whitelist
  - Restrict to whitelisted domains in production, allow localhost in development
  - Handle preflight OPTIONS requests correctly
  - Log CORS violations for security monitoring
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.10_

- [x] 5.3 Write property test for CORS header configuration
  - **Property 28: CORS Header Configuration**
  - **Validates: Requirements 8.1, 8.4, 8.5**
  - Test that cross-origin requests receive appropriate CORS headers

- [x] 5.4 Write property test for CORS origin restriction
  - **Property 29: CORS Origin Restriction**
  - **Validates: Requirements 8.2**
  - Test that non-whitelisted origins are rejected in production

- [x] 5.5 Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


## Phase 2: Service and Repository Layers (Weeks 3-4)

### 6. Base Architecture Components

- [x] 6.1 Create base service class
  - Create `lib/services/base-service.ts` with abstract `BaseService` class
  - Implement constructor accepting `SupabaseClient` and `tenantId`
  - Implement `withTransaction()` method for transaction management
  - Implement `validateTenantAccess()` method for tenant isolation
  - _Requirements: 4.1, 4.3, 4.5, 4.10_

- [x] 6.2 Create base repository class
  - Create `lib/repositories/base-repository.ts` with abstract `BaseRepository<T>` class
  - Implement CRUD methods: `findById()`, `findAll()`, `create()`, `update()`, `delete()`
  - Implement `applyTenantFilter()`, `applyPagination()`, `applySorting()` helper methods
  - _Requirements: 5.1, 5.2, 5.3, 5.6, 5.7_

- [x] 6.3 Write property test for tenant isolation enforcement
  - **Property 7: Tenant Isolation Enforcement**
  - **Validates: Requirements 2.2, 4.10, 5.3, 15.4**
  - Test that users can only access resources from their own tenant

- [x] 6.4 Write property test for transaction atomicity
  - **Property 17: Transaction Atomicity**
  - **Validates: Requirements 4.5, 5.7**
  - Test that multi-step operations either fully succeed or fully rollbacklanjut


### 7. DTO Layer

- [x] 7.1 Create DTO type definitions
  - Create `lib/dto/contact.dto.ts` with `CreateContactInput`, `UpdateContactInput`, `ContactOutput` interfaces
  - Create `lib/dto/message.dto.ts` with `SendMessageInput`, `MessageOutput` interfaces
  - Create `lib/dto/broadcast.dto.ts` with `CreateBroadcastInput`, `BroadcastOutput` interfaces
  - Exclude sensitive fields (tenant_id, internal metadata) from output DTOs
  - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.10_

- [x] 7.2 Implement DTO transformation functions
  - Implement `toContactOutput()`, `toMessageOutput()`, `toBroadcastOutput()` functions
  - Implement reverse transformations for input DTOs to database models
  - Ensure transformations preserve all non-sensitive data
  - _Requirements: 6.6, 6.7_

- [x] 7.3 Write property test for sensitive field exclusion
  - **Property 20: Sensitive Field Exclusion**
  - **Validates: Requirements 6.5**
  - Test that API responses never include sensitive fields

- [x] 7.4 Write property test for DTO transformation correctness
  - **Property 21: DTO Transformation Correctness**
  - **Validates: Requirements 6.6, 6.7**
  - Test that transforming model → DTO → model preserves data

- [x] 7.5 Write property test for nested and array validation
  - **Property 22: Nested and Array Validation**
  - **Validates: Requirements 6.8, 6.9**
  - Test that nested objects and arrays are validated recursively


### 8. Contact Service and Repository

- [x] 8.1 Implement ContactRepository
  - Create `lib/repositories/contact-repository.ts` extending `BaseRepository<Contact>`
  - Implement `findByPhoneNumber()`, `findByEmail()`, `search()`, `findByTags()` methods
  - Implement `bulkCreate()`, `bulkUpdate()` for batch operations
  - Enforce tenant filtering on all queries
  - _Requirements: 5.2, 5.3, 5.9, 12.4, 12.9_

- [x] 8.2 Implement ContactService
  - Create `lib/services/contact-service.ts` extending `BaseService`
  - Implement `createContact()`, `updateContact()`, `getContact()`, `listContacts()`, `deleteContact()` methods
  - Implement `searchContacts()`, `mergeContacts()` methods
  - Validate business rules (duplicate phone numbers, required fields)
  - _Requirements: 4.1, 4.4, 4.6, 4.7, 4.10_

- [x] 8.3 Write unit tests for ContactService
  - Test contact creation, update, retrieval, deletion
  - Test business rule validation (duplicate detection)
  - Test error handling for invalid inputs
  - _Requirements: 4.4, 4.6_

- [x] 8.4 Write property test for business rule validation
  - **Property 16: Business Rule Validation**
  - **Validates: Requirements 4.4**
  - Test that business rule violations are rejected before database access


### 9. Message Service and Repository

- [x] 9.1 Implement MessageRepository
  - Create `lib/repositories/message-repository.ts` extending `BaseRepository<Message>`
  - Implement `findByConversation()`, `findUnread()`, `markAsRead()`, `getMessageStats()` methods
  - Implement pagination for message lists
  - Optimize queries with proper indexes
  - _Requirements: 5.2, 5.3, 12.2, 12.3_

- [x] 9.2 Implement MessageService
  - Create `lib/services/message-service.ts` extending `BaseService`
  - Implement `sendMessage()`, `getMessage()`, `listMessages()`, `markAsRead()`, `deleteMessage()` methods
  - Validate message content length and media types
  - Handle WhatsApp API integration for sending
  - _Requirements: 4.1, 4.4, 4.7, 4.10_

- [x] 9.3 Write unit tests for MessageService
  - Test message sending, retrieval, marking as read
  - Test pagination and filtering
  - Test error handling for failed sends
  - _Requirements: 4.4, 4.7_


### 10. Broadcast Service and Repository

- [x] 10.1 Implement BroadcastRepository
  - Create `lib/repositories/broadcast-repository.ts` extending `BaseRepository<Broadcast>`
  - Implement `findScheduled()`, `findByStatus()`, `updateStats()`, `getBroadcastRecipients()` methods
  - Optimize queries for large recipient lists
  - _Requirements: 5.2, 5.3, 12.2_

- [x] 10.2 Implement BroadcastService
  - Create `lib/services/broadcast-service.ts` extending `BaseService`
  - Implement `createBroadcast()`, `scheduleBroadcast()`, `sendBroadcast()`, `cancelBroadcast()`, `getBroadcastStats()` methods
  - Validate recipient lists and message templates
  - Handle batch sending with rate limiting
  - _Requirements: 4.1, 4.4, 4.7, 4.10_

- [x] 10.3 Write unit tests for BroadcastService
  - Test broadcast creation, scheduling, sending
  - Test recipient list validation
  - Test stats tracking
  - _Requirements: 4.4, 4.7_

- [x] 10.4 Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


## Phase 3: Security Infrastructure (Weeks 5-6)

### 11. Session Management

- [x] 11.1 Implement session manager
  - Create `lib/security/session-manager.ts` with `SessionManager` class
  - Implement `createSession()`, `getSession()`, `updateActivity()`, `invalidateSession()` methods
  - Implement `invalidateUserSessions()`, `cleanupExpiredSessions()` methods
  - Store sessions in Redis with encryption
  - _Requirements: 29.1, 29.4, 29.5, 29.7, 29.8_

- [x] 11.2 Configure session security
  - Set HttpOnly and Secure flags on session cookies
  - Implement 30-minute inactivity timeout and 24-hour absolute timeout
  - Implement concurrent session limits (5 per user)
  - Regenerate session ID after authentication
  - _Requirements: 29.2, 29.3, 29.4, 29.5, 29.6, 29.9_

- [x] 11.3 Write property test for session ID uniqueness
  - **Property 41: Session ID Uniqueness**
  - **Validates: Requirements 29.1**
  - Test that generated session IDs are cryptographically random and unique

- [x] 11.4 Write property test for session regeneration on auth
  - **Property 42: Session Regeneration on Auth**
  - **Validates: Requirements 29.6**
  - Test that authentication generates new session ID

- [x] 11.5 Write property test for session invalidation on logout
  - **Property 43: Session Invalidation on Logout**
  - **Validates: Requirements 29.7**
  - Test that logout immediately invalidates session

- [x] 11.6 Write property test for concurrent session limits
  - **Property 44: Concurrent Session Limits**
  - **Validates: Requirements 29.9**
  - Test that exceeding session limit invalidates oldest session


### 12. Encryption Service

- [x] 12.1 Implement encryption service
  - Create `lib/security/encryption-service.ts` with `EncryptionService` class
  - Implement `encrypt()`, `decrypt()`, `encryptObject()`, `decryptObject()` methods using AES-256
  - Implement `rotateKeys()` method for key rotation
  - Use separate encryption keys per tenant
  - _Requirements: 32.2, 32.3, 32.4, 32.5, 32.6_

- [x] 12.2 Configure key management
  - Store encryption keys in environment variables or AWS KMS
  - Implement key rotation every 90 days
  - Retain old keys for decryption during rotation period
  - Never log or expose encryption keys
  - _Requirements: 32.6, 32.7, 32.8_

- [x] 12.3 Write property test for sensitive data encryption
  - **Property 46: Sensitive Data Encryption**
  - **Validates: Requirements 32.2, 32.3, 32.4**
  - Test that sensitive data is encrypted before storage

- [x] 12.4 Write property test for tenant-specific encryption keys
  - **Property 47: Tenant-Specific Encryption Keys**
  - **Validates: Requirements 32.5**
  - Test that different tenants use different encryption keys

- [x] 12.5 Write property test for encryption key rotation
  - **Property 48: Encryption Key Rotation**
  - **Validates: Requirements 32.6**
  - Test that key rotation allows decryption of old data with new keys

- [x] 12.6 Write property test for encryption key non-exposure
  - **Property 49: Encryption Key Non-Exposure**
  - **Validates: Requirements 32.8**
  - Test that encryption keys never appear in logs or responses


### 13. API Key Management

- [x] 13.1 Create API key database schema
  - Create migration for `api_keys` table with fields: id, tenant_id, name, key_prefix, key_hash, scopes, ip_whitelist, expires_at, last_used_at, created_at, revoked_at
  - Add indexes on tenant_id and key_prefix
  - _Requirements: 31.1, 31.2, 31.3_

- [x] 13.2 Implement API key manager
  - Create `lib/security/api-key-manager.ts` with `APIKeyManager` class
  - Implement `createAPIKey()`, `validateAPIKey()`, `revokeAPIKey()`, `rotateAPIKey()` methods
  - Implement `listAPIKeys()`, `updateLastUsed()` methods
  - Generate cryptographically random API keys with format `sk_live_<random>` or `sk_test_<random>`
  - _Requirements: 31.1, 31.2, 31.4, 31.9, 31.10_

- [x] 13.3 Implement API key authentication
  - Add API key validation to withAuth middleware
  - Support scoping API keys to specific permissions
  - Support IP whitelist validation
  - Log all API key usage with timestamp and endpoint
  - _Requirements: 31.5, 31.6, 31.7, 31.8_

- [x] 13.4 Write unit tests for API key manager
  - Test API key creation, validation, revocation, rotation
  - Test scope enforcement and IP whitelist validation
  - Test that full keys are never exposed after creation
  - _Requirements: 31.1, 31.4, 31.9, 31.10_


### 14. Intrusion Detection System

- [x] 14.1 Create security events database schema
  - Create migration for `security_events` table with fields: id, tenant_id, user_id, event_type, severity, ip_address, details, created_at
  - Create migration for `blocked_entities` table with fields: id, entity_type, entity_identifier, reason, blocked_at, expires_at, created_by
  - Add indexes on event_type, severity, created_at, entity_type, entity_identifier, expires_at
  - _Requirements: 34.1, 34.2, 34.4_

- [x] 14.2 Implement intrusion detection system
  - Create `lib/security/intrusion-detection.ts` with `IntrusionDetectionSystem` class
  - Implement `detectBruteForce()`, `detectCredentialStuffing()`, `detectSuspiciousPattern()` methods
  - Implement `blockIP()`, `blockUser()`, `isBlocked()` methods
  - Implement `logThreatEvent()`, `getActiveThreats()` methods
  - _Requirements: 34.1, 34.2, 34.3, 34.4, 34.6, 34.10_

- [x] 14.3 Configure detection rules
  - Brute force: 5 failed login attempts in 5 minutes → 15 minute IP block
  - Credential stuffing: 20 failed logins from same IP in 1 hour → 1 hour IP block
  - Implement geo-blocking for high-risk countries (configurable)
  - Implement bot detection based on user-agent and request patterns
  - _Requirements: 34.1, 34.2, 34.5, 34.7_

- [x] 14.4 Write unit tests for intrusion detection
  - Test brute force detection and blocking
  - Test credential stuffing detection
  - Test IP blocking and expiration
  - Test threat event logging
  - _Requirements: 34.1, 34.2, 34.4, 34.10_


### 15. File Storage Security

- [x] 15.1 Create file uploads database schema
  - Create migration for `file_uploads` table with fields: id, tenant_id, user_id, filename, original_filename, mime_type, size_bytes, storage_path, checksum, malware_scanned, malware_detected, created_at, deleted_at
  - Add indexes on tenant_id and user_id
  - _Requirements: 35.1, 35.2, 35.7_

- [x] 15.2 Implement file storage service
  - Create `lib/security/file-storage.ts` with `FileStorageService` class
  - Implement `uploadFile()`, `getFile()`, `getSignedUrl()`, `deleteFile()` methods
  - Implement `scanForMalware()`, `validateFile()` methods
  - Store files in tenant-specific directories with unique generated filenames
  - _Requirements: 35.1, 35.2, 35.3, 35.4, 35.5, 35.6_

- [x] 15.3 Implement file validation and security
  - Validate MIME types against whitelist (images, videos, audio, documents)
  - Validate file sizes against maximum limits (10MB default)
  - Strip metadata from uploaded files
  - Generate SHA-256 checksums for integrity checking
  - Encrypt files at rest using AES-256
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.8, 16.9, 35.6, 35.7_

- [x] 15.4 Write property test for file upload validation
  - **Property 3: File Upload Validation**
  - **Validates: Requirements 1.8**
  - Test that invalid file types and sizes are rejected

- [x] 15.5 Write unit tests for file storage service
  - Test file upload, retrieval, deletion
  - Test signed URL generation with expiration
  - Test file validation (type, size, malware)
  - Test tenant isolation in file storage
  - _Requirements: 16.1, 16.2, 16.3, 35.3, 35.4_


### 16. Webhook Security

- [x] 16.1 Implement webhook handler
  - Create `lib/security/webhook-handler.ts` with `WebhookHandler` class
  - Implement `verifySignature()`, `processWebhook()`, `preventReplay()`, `queueWebhook()` methods
  - Support HMAC signature verification (SHA-256, SHA-512)
  - Implement replay attack prevention using Redis to track processed webhook IDs
  - _Requirements: 19.1, 19.2, 19.3, 19.7, 19.8_

- [x] 16.2 Configure webhook security
  - Validate webhook payload structure against schemas
  - Rate limit webhook endpoints (10000 requests/hour per tenant)
  - Log all webhook requests for audit
  - Return 200 status immediately after queuing for async processing
  - Implement timeout for long-running webhook processing
  - _Requirements: 19.2, 19.4, 19.5, 19.9, 19.10_

- [x] 16.3 Write unit tests for webhook handler
  - Test signature verification (valid and invalid signatures)
  - Test replay attack prevention
  - Test webhook queuing and async processing
  - Test idempotency handling
  - _Requirements: 19.1, 19.3, 19.7, 19.8_

- [x] 16.4 Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


## Phase 4: Monitoring and Compliance (Weeks 7-8)

### 17. Performance Monitoring

- [x] 17.1 Implement performance monitor
  - Create `lib/monitoring/performance-monitor.ts` with `PerformanceMonitor` class
  - Implement `recordMetric()`, `getStats()`, `getSlowQueries()`, `alertOnThreshold()` methods
  - Track response time, database query time, cache hit/miss rates, error rates per endpoint
  - Track concurrent request count, memory usage, CPU usage
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.10_

- [x] 17.2 Configure performance alerting
  - Response time > 1000ms: Warning
  - Response time > 3000ms: Critical
  - Error rate > 5%: Warning
  - Error rate > 10%: Critical
  - Cache hit rate < 70%: Warning
  - _Requirements: 11.6, 11.7_

- [x] 17.3 Integrate performance monitoring with middleware
  - Add performance tracking to withAuth middleware
  - Record metrics for all API requests
  - Send metrics to monitoring system (Sentry)
  - _Requirements: 11.1, 11.8, 11.9_

- [x] 17.4 Write unit tests for performance monitor
  - Test metric recording and retrieval
  - Test stats calculation (avg, p50, p95, p99)
  - Test alerting thresholds
  - _Requirements: 11.1, 11.6, 11.7_


### 18. Health Check Endpoints

- [x] 18.1 Implement health check service
  - Create `lib/monitoring/health-check.ts` with `HealthCheckService` class
  - Implement `checkHealth()`, `checkDatabase()`, `checkRedis()`, `checkExternalAPI()`, `checkStorage()` methods
  - Return component status (up, down, degraded) with response times
  - _Requirements: 18.3, 18.4, 18.5_

- [x] 18.2 Create health check API routes
  - Create `/api/health` endpoint for basic health check (returns 200 if all systems operational)
  - Create `/api/health/ready` endpoint for Kubernetes readiness checks
  - Create `/api/health/live` endpoint for Kubernetes liveness checks
  - Health checks should not require authentication
  - Health checks should execute quickly (under 1 second)
  - _Requirements: 18.1, 18.2, 18.6, 18.7, 18.9, 18.10_

- [x] 18.3 Write unit tests for health check service
  - Test health check for each component (database, Redis, external API, storage)
  - Test overall health status calculation
  - Test response time tracking
  - _Requirements: 18.3, 18.4, 18.5, 18.6, 18.7_


### 19. Audit Logging

- [x] 19.1 Create audit logs database schema
  - Create migration for `audit_logs` table with fields: id, tenant_id, user_id, action, resource_type, resource_id, changes, ip_address, user_agent, created_at
  - Add indexes on tenant_id, user_id, action, created_at
  - _Requirements: 25.6_

- [x] 19.2 Implement audit logger
  - Create `lib/security/audit-logger.ts` with `AuditLogger` class
  - Implement `logAction()`, `queryLogs()`, `exportLogs()` methods
  - Log authentication attempts, authorization failures, data modifications, permission changes, API key operations, security events
  - Make audit logs immutable and tamper-evident
  - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5, 25.7, 25.9_

- [x] 19.3 Integrate audit logging with services
  - Add audit logging to all service layer operations
  - Log user ID, tenant ID, timestamp, action, resource type, resource ID, changes
  - Never log sensitive data (passwords, tokens, API keys)
  - _Requirements: 25.6, 25.10_

- [x] 19.4 Write property test for cross-tenant access logging
  - **Property 39: Cross-Tenant Access Logging**
  - **Validates: Requirements 15.10**
  - Test that cross-tenant access attempts are logged in audit log

- [x] 19.5 Write property test for session event logging
  - **Property 45: Session Event Logging**
  - **Validates: Requirements 29.10**
  - Test that session creation/destruction events are logged

- [x] 19.6 Write unit tests for audit logger
  - Test action logging for different event types
  - Test log querying with filters
  - Test log export functionality
  - Test that sensitive data is never logged
  - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5, 25.9, 25.10_


### 20. GDPR Compliance Features

- [x] 20.1 Implement data export functionality
  - Create API endpoint `/api/compliance/export` for user data export
  - Export all user data in JSON format (contacts, messages, broadcasts, settings)
  - Include metadata (created_at, updated_at) in export
  - Require authentication and authorization for export requests
  - _Requirements: 38.1_

- [x] 20.2 Implement data deletion functionality
  - Create API endpoint `/api/compliance/delete` for user data deletion (right to be forgotten)
  - Delete all user data across all tables (contacts, messages, broadcasts, files)
  - Anonymize audit logs (replace user_id with "deleted_user")
  - Implement soft delete with retention period before permanent deletion
  - _Requirements: 38.2_

- [x] 20.3 Implement consent management
  - Create database schema for consent tracking (consent_type, granted_at, revoked_at)
  - Track privacy policy and terms of service acceptance
  - Track data processing consent per purpose
  - Provide API endpoints for consent management
  - _Requirements: 38.3, 38.4_

- [x] 20.4 Implement data retention policies
  - Configure retention periods per data type (messages: 2 years, audit logs: 7 years)
  - Implement automated cleanup jobs for expired data
  - Document retention policies in privacy policy
  - _Requirements: 38.6_

- [x] 20.5 Write unit tests for compliance features
  - Test data export completeness
  - Test data deletion (soft and hard delete)
  - Test consent tracking and management
  - Test retention policy enforcement
  - _Requirements: 38.1, 38.2, 38.3, 38.4, 38.6_


### 21. Security Scanning and Documentation

- [x] 21.1 Configure security scanning in CI/CD
  - Add npm audit to CI/CD pipeline
  - Add Snyk or similar tool for dependency vulnerability scanning
  - Fail builds on critical vulnerabilities
  - Configure automated security testing
  - _Requirements: 33.1, 33.2, 33.3, 33.4_

- [x] 21.2 Implement static code analysis
  - Add ESLint security rules (eslint-plugin-security)
  - Add secret scanning (detect-secrets or similar)
  - Configure pre-commit hooks for security checks
  - _Requirements: 33.6, 33.7, 39.6, 39.7_

- [x] 21.3 Create API documentation
  - Generate OpenAPI 3.0 specification from code annotations
  - Document all API endpoints with request/response schemas
  - Document authentication requirements and rate limits
  - Document error codes and messages
  - Create `/api/docs` endpoint with Swagger UI
  - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7, 22.9, 22.10_

- [x] 21.4 Create security documentation
  - Document security architecture and threat model
  - Document incident response procedures
  - Document security best practices for developers
  - Document compliance requirements and controls
  - _Requirements: 37.1, 39.1, 39.3, 39.9, 40.10_

- [x] 21.5 Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


## Phase 5: Migration and Optimization (Weeks 9-10)

### 22. Redis Caching Implementation

- [x] 22.1 Implement cache layer
  - Create `lib/cache/cache-layer.ts` with caching utilities
  - Implement cache-aside pattern for read operations
  - Implement cache invalidation on data updates
  - Use tenant-specific cache keys for isolation
  - _Requirements: 10.1, 10.5, 10.6, 10.7_

- [x] 22.2 Configure cache TTLs
  - User permissions: 5 minutes
  - Tenant configuration: 10 minutes
  - Conversation lists: 30 seconds
  - Contact lists: 1 minute
  - _Requirements: 10.2, 10.3, 10.4_

- [x] 22.3 Implement cache graceful degradation
  - Handle Redis connection failures gracefully
  - Fall back to direct database queries when Redis unavailable
  - Log cache failures for monitoring
  - _Requirements: 10.9, 24.1, 24.2_

- [x] 22.4 Write property test for cache-aside pattern
  - **Property 32: Cache-Aside Pattern**
  - **Validates: Requirements 10.5**
  - Test that cache miss triggers database fetch and cache update

- [x] 22.5 Write property test for cache invalidation
  - **Property 33: Cache Invalidation on Update**
  - **Validates: Requirements 10.6**
  - Test that data updates invalidate corresponding cache entries

- [x] 22.6 Write property test for tenant-specific cache keys
  - **Property 34: Tenant-Specific Cache Keys**
  - **Validates: Requirements 10.7**
  - Test that cache keys include tenant ID for isolation

- [x] 22.7 Write property test for cache graceful degradation
  - **Property 35: Cache Graceful Degradation**
  - **Validates: Requirements 10.9**
  - Test that system continues functioning when Redis unavailable


### 23. Database Query Optimization

- [x] 23.1 Add database indexes
  - Add indexes on frequently queried fields (tenant_id, user_id, created_at, phone_number, email)
  - Add composite indexes for common query patterns
  - Analyze slow query logs and add indexes as needed
  - _Requirements: 12.1_

- [x] 23.2 Implement pagination
  - Add pagination support to all list queries in repositories
  - Use cursor-based pagination for large datasets
  - Implement page size limits (default 50, max 100)
  - _Requirements: 12.2_

- [x] 23.3 Optimize query projections
  - Use select projections to fetch only required fields
  - Avoid SELECT * queries
  - Implement field selection in repository methods
  - _Requirements: 12.3_

- [x] 23.4 Optimize joins and batch operations
  - Avoid N+1 query problems with proper joins
  - Implement batch operations for bulk inserts/updates
  - Use database transactions efficiently
  - Monitor slow queries and log warnings
  - _Requirements: 12.4, 12.8, 12.9, 12.10_

- [x] 23.5 Write unit tests for query optimization
  - Test pagination with different page sizes
  - Test field projection (only requested fields returned)
  - Test batch operations
  - _Requirements: 12.2, 12.3, 12.9_


### 24. Migrate Existing API Routes

- [x] 24.1 Migrate contact API routes
  - Update `/api/contacts/*` routes to use new middleware, service, and repository layers
  - Replace direct Supabase queries with ContactService calls
  - Add input validation with Zod schemas
  - Add rate limiting and security headers
  - Maintain backward compatibility with existing API contracts
  - _Requirements: 4.7, 9.1, 9.2_

- [x] 24.2 Migrate message API routes
  - Update `/api/messages/*` routes to use new middleware, service, and repository layers
  - Replace direct Supabase queries with MessageService calls
  - Add input validation with Zod schemas
  - Add rate limiting and security headers
  - _Requirements: 4.7, 9.1, 9.2_

- [x] 24.3 Migrate broadcast API routes
  - Update `/api/broadcasts/*` routes to use new middleware, service, and repository layers
  - Replace direct Supabase queries with BroadcastService calls
  - Add input validation with Zod schemas
  - Add rate limiting and security headers
  - _Requirements: 4.7, 9.1, 9.2_

- [x] 24.4 Migrate conversation API routes
  - Update `/api/conversations/*` routes to use new middleware, service, and repository layers
  - Create ConversationService and ConversationRepository if needed
  - Add input validation with Zod schemas
  - Add rate limiting and security headers
  - _Requirements: 4.7, 9.1, 9.2_

- [x] 24.5 Write integration tests for migrated routes
  - Test end-to-end API flows for contacts, messages, broadcasts, conversations
  - Test authentication and authorization
  - Test input validation and error handling
  - Test rate limiting behavior
  - _Requirements: 23.2, 23.9_


### 25. Update Frontend Components

- [x] 25.1 Update frontend to use new API contracts
  - Update React hooks to call new API endpoints
  - Update error handling to use new error response format
  - Update loading states and error messages
  - Remove any direct Supabase client usage from UI components
  - _Requirements: 9.1, 9.3, 9.8, 9.9_

- [x] 25.2 Implement real-time updates with RLS
  - Keep Supabase Realtime subscriptions for real-time updates
  - Ensure RLS policies are enforced on subscriptions
  - Handle connection failures gracefully
  - _Requirements: 9.7_

- [x] 25.3 Update TypeScript types
  - Update frontend TypeScript types to match DTO definitions
  - Ensure type safety across frontend-backend boundary
  - _Requirements: 9.10_

- [x] 25.4 Write E2E tests for frontend integration
  - Test complete user flows (create contact, send message, create broadcast)
  - Test error handling and validation feedback
  - Test real-time updates
  - _Requirements: 9.1, 9.3, 9.7_


### 26. Performance Testing and Optimization

- [x] 26.1 Conduct load testing
  - Use k6 or Artillery for load testing
  - Test API endpoints under load (100, 500, 1000 concurrent users)
  - Identify performance bottlenecks
  - Measure response times at different percentiles (p50, p95, p99)
  - _Requirements: 11.1, 11.2_

- [x] 26.2 Optimize identified bottlenecks
  - Optimize slow database queries
  - Tune cache TTLs based on hit rates
  - Optimize connection pooling settings
  - Implement query result caching where appropriate
  - _Requirements: 12.5, 12.6, 12.7_

- [x] 26.3 Verify performance targets
  - Response time < 500ms for 95% of requests
  - Error rate < 1% under normal load
  - Cache hit rate > 70%
  - Database query time < 100ms for 95% of queries
  - _Requirements: 11.1, 11.2, 11.3_

- [x] 26.4 Write performance tests
  - Test response time under load
  - Test cache hit rates
  - Test database query performance
  - _Requirements: 23.5_


### 27. Security Testing and Validation

- [x] 27.1 Conduct security testing
  - Test SQL injection prevention with malicious payloads
  - Test XSS prevention with script injection attempts
  - Test CSRF protection on state-changing operations
  - Test authentication bypass attempts
  - Test authorization bypass attempts
  - _Requirements: 23.3, 26.1-26.10, 27.1-27.10, 28.1-28.10_

- [x] 27.2 Test intrusion detection
  - Test brute force detection and blocking
  - Test credential stuffing detection
  - Test rate limiting under attack scenarios
  - Test IP blocking and expiration
  - _Requirements: 34.1, 34.2, 34.4_

- [x] 27.3 Test encryption and key management
  - Test data encryption at rest
  - Test encryption key rotation
  - Test tenant-specific encryption keys
  - Test that keys are never exposed
  - _Requirements: 32.2, 32.3, 32.4, 32.5, 32.6, 32.8_

- [x] 27.4 Write property test for SQL injection prevention
  - **Property 40: SQL Injection Attempt Logging**
  - **Validates: Requirements 26.10**
  - Test that SQL injection attempts are logged as security events

- [x] 27.5 Write security tests for all critical paths
  - Test authentication and authorization on all endpoints
  - Test tenant isolation across all operations
  - Test input validation on all endpoints
  - Test rate limiting on all endpoints
  - _Requirements: 23.3, 23.9_


### 28. Final Integration and Deployment

- [x] 28.1 Verify test coverage
  - Run code coverage analysis
  - Ensure minimum 80% code coverage
  - Ensure 100% coverage for security-critical paths
  - _Requirements: 23.7_

- [x] 28.2 Run comprehensive test suite
  - Run all unit tests
  - Run all property tests (minimum 100 iterations each)
  - Run all integration tests
  - Run all E2E tests
  - Ensure all tests pass
  - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.8_

- [x] 28.3 Deploy to staging environment
  - Deploy to staging with production-like configuration
  - Run smoke tests on staging
  - Verify health check endpoints
  - Verify monitoring and alerting
  - _Requirements: 18.1, 18.2_

- [x] 28.4 Conduct security audit
  - Review security controls implementation
  - Review audit logs and monitoring
  - Review compliance features
  - Document security posture
  - _Requirements: 33.8, 37.8, 38.8, 39.2_

- [x] 28.5 Create deployment runbook
  - Document deployment procedures
  - Document rollback procedures
  - Document incident response procedures
  - Document monitoring and alerting setup
  - _Requirements: 21.1, 21.2, 21.3, 37.1, 37.7_

- [x] 28.6 Deploy to production
  - Deploy to production with zero-downtime strategy
  - Monitor error rates and performance metrics
  - Verify all systems operational
  - Enable monitoring and alerting
  - _Requirements: 11.8, 11.9_

- [x] 28.7 Final checkpoint - Verify production deployment
  - Ensure all tests pass, ask the user if questions arise.


## Additional Property Tests

### 29. Remaining Property Tests

- [x] 29.1 Write property test for context injection
  - **Property 9: Context Injection**
  - **Validates: Requirements 2.6, 2.7, 15.1**
  - Test that authenticated requests have user context injected

- [x] 29.2 Write property test for RLS policy enforcement
  - **Property 10: RLS Policy Enforcement**
  - **Validates: Requirements 2.8**
  - Test that RLS policies prevent cross-tenant data access

- [x] 29.3 Write property test for authentication failure logging
  - **Property 11: Authentication Failure Logging**
  - **Validates: Requirements 2.10**
  - Test that authentication failures are logged

- [x] 29.4 Write property test for sliding window rate limiting
  - **Property 14: Sliding Window Rate Limiting**
  - **Validates: Requirements 3.5**
  - Test that sliding window algorithm counts requests accurately

- [x] 29.5 Write property test for tenant-specific rate limits
  - **Property 15: Tenant-Specific Rate Limits**
  - **Validates: Requirements 3.9**
  - Test that different tenants have different rate limits

- [x] 29.6 Write property test for domain exception types
  - **Property 18: Domain Exception Types**
  - **Validates: Requirements 4.6**
  - Test that service layer throws typed domain exceptions

- [x] 29.7 Write property test for repository CRUD completeness
  - **Property 19: Repository CRUD Completeness**
  - **Validates: Requirements 5.2**
  - Test that all repositories provide working CRUD operations

- [x] 29.8 Write property test for exception handling
  - **Property 23: Exception Handling**
  - **Validates: Requirements 7.1, 7.3**
  - Test that unhandled exceptions are caught and logged

- [x] 29.9 Write property test for error codes and request IDs
  - **Property 26: Error Codes and Request IDs**
  - **Validates: Requirements 7.8, 7.9**
  - Test that error responses include error codes and request IDs

- [x] 29.10 Write property test for error monitoring integration
  - **Property 27: Error Monitoring Integration**
  - **Validates: Requirements 7.10**
  - Test that errors are sent to monitoring system

- [x] 29.11 Write property test for CORS preflight handling
  - **Property 30: CORS Preflight Handling**
  - **Validates: Requirements 8.6, 8.8**
  - Test that OPTIONS requests receive correct CORS headers

- [x] 29.12 Write property test for CORS violation logging
  - **Property 31: CORS Violation Logging**
  - **Validates: Requirements 8.10**
  - Test that CORS violations are logged

- [x] 29.13 Write property test for cache metrics tracking
  - **Property 36: Cache Metrics Tracking**
  - **Validates: Requirements 10.10**
  - Test that cache operations are tracked for monitoring

- [x] 29.14 Write property test for tenant isolation in rate limiting
  - **Property 37: Tenant Isolation in Rate Limiting**
  - **Validates: Requirements 15.8**
  - Test that rate limit counters are separate per tenant

- [x] 29.15 Write property test for tenant-specific metrics
  - **Property 38: Tenant-Specific Metrics**
  - **Validates: Requirements 15.9**
  - Test that metrics include tenant ID for per-tenant tracking


## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties (minimum 100 iterations each)
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
- Checkpoints ensure incremental validation at phase boundaries
- All 40 requirements are addressed across the implementation tasks
- All 49 correctness properties have corresponding property test tasks
- Security-critical components require 100% test coverage
- Maintain backward compatibility throughout migration
- No breaking changes to existing APIs during implementation

## Implementation Strategy

1. **Incremental Rollout**: Each phase can be deployed independently without breaking existing functionality
2. **Backward Compatibility**: New architecture coexists with existing code during migration
3. **Testing First**: Write tests before or alongside implementation for all security-critical components
4. **Security by Default**: All new routes use enhanced middleware with validation, rate limiting, and security headers
5. **Performance Monitoring**: Track metrics from day one to identify bottlenecks early
6. **Documentation**: Document as you build - API docs, security docs, runbooks

## Success Criteria

- All 40 requirements implemented and verified
- All 49 correctness properties tested with property-based tests
- Minimum 80% code coverage (100% for security paths)
- All security tests passing
- Performance targets met (response time < 500ms p95, error rate < 1%)
- Zero breaking changes to existing APIs
- Multi-tenant isolation verified at all layers
- Production deployment successful with monitoring enabled

## Risk Mitigation

- **Risk**: Breaking existing functionality during migration
  - **Mitigation**: Comprehensive regression testing, incremental rollout, feature flags
  
- **Risk**: Performance degradation from additional security layers
  - **Mitigation**: Performance testing at each phase, caching strategy, query optimization
  
- **Risk**: Redis/external dependency failures
  - **Mitigation**: Graceful degradation, circuit breakers, fallback mechanisms
  
- **Risk**: Security vulnerabilities in new code
  - **Mitigation**: Security testing, code reviews, automated scanning, penetration testing

