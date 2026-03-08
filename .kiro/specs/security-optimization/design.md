# Design Document: Security and Optimization for WhatsApp CRM

## Overview

This design document specifies the technical architecture for implementing comprehensive security hardening and performance optimization for a multi-tenant WhatsApp CRM system built with Next.js 13+ (App Router), Supabase PostgreSQL, Redis, and TypeScript.

### Current State

The system currently has:
- Basic authentication via Supabase Auth
- RBAC system with dynamic permissions
- Some middleware for auth checks
- Direct database access from API routes
- Basic Redis caching infrastructure
- No input validation layer
- No rate limiting
- No centralized error handling
- Limited security headers
- No audit logging
- No intrusion detection

### Target State

The enhanced system will implement:
- **Defense-in-depth security**: Multiple layers of security controls
- **Layered architecture**: Middleware → Service → Repository → Database
- **Input validation**: Zod schemas for all API inputs
- **Rate limiting**: Redis-based distributed rate limiting
- **Comprehensive monitoring**: Performance tracking, audit logs, security alerts
- **Data protection**: Encryption at rest and in transit, secure file storage
- **Incident response**: Detection, prevention, and response capabilities
- **Compliance**: GDPR-ready with data export, deletion, and consent management

### Design Principles

1. **Security by Default**: All routes protected unless explicitly public
2. **Least Privilege**: Minimum permissions required for each operation
3. **Defense in Depth**: Multiple security layers (middleware, service, repository, database RLS)
4. **Fail Secure**: System fails to secure state, not open state
5. **Auditability**: All security-relevant actions logged
6. **Performance**: Security controls optimized to minimize latency
7. **Migration Ready**: Architecture prepared for potential NestJS migration
8. **Incremental Implementation**: Phased rollout without breaking existing functionality



## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  (Next.js Frontend, External API Clients, Webhooks)             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Security Middleware Layer                     │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│  │ Rate Limiter │ Auth/RBAC    │ Input        │ CORS         │ │
│  │              │ Validator    │ Validator    │ Handler      │ │
│  └──────────────┴──────────────┴──────────────┴──────────────┘ │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│  │ Security     │ Request      │ Error        │ Session      │ │
│  │ Headers      │ Logger       │ Handler      │ Manager      │ │
│  └──────────────┴──────────────┴──────────────┴──────────────┘ │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Route Layer                             │
│  (Next.js App Router API Routes - Thin Controllers)             │
│  - Request/Response handling                                     │
│  - DTO transformation                                            │
│  - Delegates to Service Layer                                    │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                               │
│  (Business Logic, Transaction Management, Domain Rules)          │
│  - ContactService, MessageService, BroadcastService, etc.        │
│  - Business rule validation                                      │
│  - Transaction coordination                                      │
│  - Calls Repository Layer                                        │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Repository Layer                              │
│  (Data Access Abstraction, Query Optimization)                   │
│  - ContactRepository, MessageRepository, etc.                    │
│  - CRUD operations                                               │
│  - Query optimization                                            │
│  - Tenant isolation enforcement                                  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Data Layer                                   │
│  ┌──────────────────────┬──────────────────────┐               │
│  │  Supabase PostgreSQL │  Redis Cache         │               │
│  │  (with RLS)          │  (Rate Limit, Cache) │               │
│  └──────────────────────┴──────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   Cross-Cutting Concerns                         │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│  │ Monitoring   │ Audit        │ Encryption   │ File         │ │
│  │ System       │ Logging      │ Service      │ Storage      │ │
│  └──────────────┴──────────────┴──────────────┴──────────────┘ │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│  │ Intrusion    │ Health       │ API          │ Webhook      │ │
│  │ Detection    │ Checks       │ Client       │ Handler      │ │
│  └──────────────┴──────────────┴──────────────┴──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```



### Request Flow

```
1. Client Request
   ↓
2. Next.js Middleware (middleware.ts)
   - Session validation
   - Tenant context injection
   - Permission header injection
   ↓
3. API Route Handler
   - withAuth wrapper execution
   ↓
4. Security Middleware Stack (within withAuth)
   - Rate limiting check
   - Authentication verification
   - Authorization/RBAC check
   - Input validation (Zod)
   - Request logging
   ↓
5. API Route Logic
   - Parse request
   - Transform to DTO
   - Call Service Layer
   ↓
6. Service Layer
   - Business logic validation
   - Transaction management
   - Call Repository Layer
   ↓
7. Repository Layer
   - Tenant isolation enforcement
   - Query optimization
   - Cache check/update
   - Database query (with RLS)
   ↓
8. Response Path
   - Repository → Service → API Route
   - DTO transformation
   - Error handling
   - Security headers injection
   - Audit logging
   - Response to client
```

### Security Layers

The system implements defense-in-depth with multiple security layers:

1. **Network Layer**: TLS 1.3, CORS, security headers
2. **Middleware Layer**: Rate limiting, authentication, authorization, input validation
3. **Application Layer**: Service-level business rules, DTO validation
4. **Data Access Layer**: Repository-level tenant isolation, query parameterization
5. **Database Layer**: Row-Level Security (RLS) policies, encryption at rest
6. **Monitoring Layer**: Intrusion detection, audit logging, security alerts



## Components and Interfaces

### 1. Middleware Layer Components

#### 1.1 Enhanced withAuth Middleware

**Location**: `lib/middleware/with-auth.ts` (enhanced version)

**Purpose**: Centralized authentication, authorization, rate limiting, and input validation

**Interface**:
```typescript
interface WithAuthOptions {
  permission?: string
  anyPermission?: string[]
  allPermissions?: string[]
  roles?: string[]
  skipTenant?: boolean
  rateLimit?: RateLimitConfig
  validation?: {
    body?: ZodSchema
    query?: ZodSchema
    params?: ZodSchema
  }
}

interface RateLimitConfig {
  maxRequests: number
  windowSeconds: number
  keyPrefix?: string
}

interface AuthContext {
  user: { id: string; email?: string }
  profile: { id: string; tenant_id: string; role?: string }
  tenantId: string
  supabase: SupabaseClient
  serviceClient: SupabaseClient
  validatedBody?: any
  validatedQuery?: any
  validatedParams?: any
}

function withAuth(
  handler: AuthHandler,
  options?: WithAuthOptions
): NextApiHandler
```

**Responsibilities**:
- Session validation via Supabase Auth
- Permission checking via RBAC system
- Rate limiting via Redis
- Input validation via Zod schemas
- Request logging
- Error handling and sanitization
- Security header injection

**Implementation Strategy**:
- Extend existing `lib/rbac/with-auth.ts`
- Add rate limiting integration
- Add input validation integration
- Add request logging
- Maintain backward compatibility



#### 1.2 Rate Limiter

**Location**: `lib/middleware/rate-limiter.ts`

**Purpose**: Distributed rate limiting using Redis with sliding window algorithm

**Interface**:
```typescript
interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  reset: number
}

interface RateLimitOptions {
  maxRequests: number
  windowSeconds: number
  keyPrefix: string
  identifier: string // tenant_id, user_id, or IP
}

class RateLimiter {
  async checkLimit(options: RateLimitOptions): Promise<RateLimitResult>
  async incrementCounter(options: RateLimitOptions): Promise<void>
  async resetLimit(identifier: string): Promise<void>
}
```

**Rate Limit Tiers**:
- Authentication endpoints: 5 requests/minute per IP
- WhatsApp message sending: 100 requests/hour per tenant
- Standard API endpoints: 1000 requests/hour per tenant
- Admin endpoints: 500 requests/hour per user
- Webhook endpoints: 10000 requests/hour per tenant

**Implementation**:
- Sliding window algorithm using Redis sorted sets
- Distributed across multiple instances
- Graceful degradation to in-memory if Redis unavailable
- Rate limit headers in response (X-RateLimit-*)

#### 1.3 Input Validator

**Location**: `lib/middleware/input-validator.ts`

**Purpose**: Centralized input validation using Zod schemas

**Interface**:
```typescript
interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: ValidationError[]
}

interface ValidationError {
  field: string
  message: string
  code: string
}

class InputValidator {
  static validate<T>(
    schema: ZodSchema<T>,
    data: unknown
  ): ValidationResult<T>
  
  static sanitizeString(input: string): string
  static sanitizeHtml(input: string): string
  static validatePhoneNumber(phone: string): boolean
  static validateEmail(email: string): boolean
}
```

**Common Schemas** (`lib/validation/schemas.ts`):
```typescript
// Contact schemas
const CreateContactSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone_number: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  email: z.string().email().optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string()).max(50).optional(),
  metadata: z.record(z.unknown()).optional()
})

// Message schemas
const SendMessageSchema = z.object({
  conversation_id: z.string().uuid(),
  content: z.string().min(1).max(4096),
  media_url: z.string().url().optional(),
  media_type: z.enum(['image', 'video', 'audio', 'document']).optional()
})

// Broadcast schemas
const CreateBroadcastSchema = z.object({
  name: z.string().min(1).max(255),
  message_template: z.string().min(1).max(4096),
  recipient_list_id: z.string().uuid(),
  scheduled_at: z.string().datetime().optional()
})

// File upload schemas
const FileUploadSchema = z.object({
  file: z.instanceof(File),
  type: z.enum(['image', 'video', 'audio', 'document']),
  maxSize: z.number().max(10 * 1024 * 1024) // 10MB
})
```



#### 1.4 Error Handler

**Location**: `lib/middleware/error-handler.ts`

**Purpose**: Centralized error handling with sanitized messages and logging

**Interface**:
```typescript
interface ErrorResponse {
  error: string
  message: string
  code: string
  requestId: string
  timestamp: string
}

class ErrorHandler {
  static handle(error: Error, requestId: string): NextResponse
  static sanitizeError(error: Error): ErrorResponse
  static logError(error: Error, context: ErrorContext): void
}

class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
    public isOperational: boolean = true
  )
}

// Specific error types
class ValidationError extends AppError
class AuthenticationError extends AppError
class AuthorizationError extends AppError
class RateLimitError extends AppError
class NotFoundError extends AppError
class ConflictError extends AppError
```

**Error Codes**:
- `AUTH_001`: Authentication required
- `AUTH_002`: Invalid credentials
- `AUTH_003`: Session expired
- `AUTHZ_001`: Insufficient permissions
- `AUTHZ_002`: Tenant access denied
- `VAL_001`: Invalid input
- `VAL_002`: Missing required field
- `RATE_001`: Rate limit exceeded
- `DB_001`: Database error
- `EXT_001`: External API error

#### 1.5 Request Logger

**Location**: `lib/middleware/request-logger.ts`

**Purpose**: Structured logging of all API requests

**Interface**:
```typescript
interface RequestLog {
  requestId: string
  timestamp: string
  method: string
  path: string
  query: Record<string, string>
  userId?: string
  tenantId?: string
  ip: string
  userAgent: string
  statusCode: number
  duration: number
  error?: string
}

class RequestLogger {
  static logRequest(log: RequestLog): void
  static logSecurityEvent(event: SecurityEvent): void
}

interface SecurityEvent {
  type: 'auth_failure' | 'authz_failure' | 'rate_limit' | 'suspicious_activity'
  userId?: string
  tenantId?: string
  ip: string
  details: Record<string, unknown>
  timestamp: string
}
```



#### 1.6 Security Headers Middleware

**Location**: `lib/middleware/security-headers.ts`

**Purpose**: Inject security headers into all responses

**Headers Configuration**:
```typescript
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
}

function addSecurityHeaders(response: NextResponse): NextResponse
```

### 2. Service Layer Components

**Location**: `lib/services/`

**Purpose**: Business logic layer that abstracts operations from API routes

#### 2.1 Base Service

**Location**: `lib/services/base-service.ts`

**Interface**:
```typescript
abstract class BaseService {
  constructor(
    protected supabase: SupabaseClient,
    protected tenantId: string
  )
  
  protected async withTransaction<T>(
    callback: (client: SupabaseClient) => Promise<T>
  ): Promise<T>
  
  protected validateTenantAccess(resourceTenantId: string): void
}
```

#### 2.2 Contact Service

**Location**: `lib/services/contact-service.ts`

**Interface**:
```typescript
interface CreateContactDTO {
  name?: string
  phone_number: string
  email?: string
  notes?: string
  tags?: string[]
  metadata?: Record<string, unknown>
}

interface UpdateContactDTO {
  name?: string
  email?: string
  notes?: string
  tags?: string[]
  metadata?: Record<string, unknown>
}

interface ContactDTO {
  id: string
  tenant_id: string
  name: string | null
  phone_number: string
  email: string | null
  notes: string | null
  tags: string[]
  avatar_url: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

class ContactService extends BaseService {
  async createContact(data: CreateContactDTO): Promise<ContactDTO>
  async updateContact(id: string, data: UpdateContactDTO): Promise<ContactDTO>
  async getContact(id: string): Promise<ContactDTO>
  async listContacts(filters: ContactFilters): Promise<ContactDTO[]>
  async deleteContact(id: string): Promise<void>
  async searchContacts(query: string): Promise<ContactDTO[]>
  async mergeContacts(sourceId: string, targetId: string): Promise<ContactDTO>
}
```



#### 2.3 Message Service

**Location**: `lib/services/message-service.ts`

**Interface**:
```typescript
interface SendMessageDTO {
  conversation_id: string
  content: string
  media_url?: string
  media_type?: 'image' | 'video' | 'audio' | 'document'
}

interface MessageDTO {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  media_url: string | null
  media_type: string | null
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  created_at: string
}

class MessageService extends BaseService {
  async sendMessage(data: SendMessageDTO): Promise<MessageDTO>
  async getMessage(id: string): Promise<MessageDTO>
  async listMessages(conversationId: string, pagination: Pagination): Promise<MessageDTO[]>
  async markAsRead(messageId: string): Promise<void>
  async deleteMessage(id: string): Promise<void>
}
```

#### 2.4 Broadcast Service

**Location**: `lib/services/broadcast-service.ts`

**Interface**:
```typescript
interface CreateBroadcastDTO {
  name: string
  message_template: string
  recipient_list_id: string
  scheduled_at?: string
}

interface BroadcastDTO {
  id: string
  tenant_id: string
  name: string
  message_template: string
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed'
  total_recipients: number
  sent_count: number
  delivered_count: number
  failed_count: number
  scheduled_at: string | null
  created_at: string
}

class BroadcastService extends BaseService {
  async createBroadcast(data: CreateBroadcastDTO): Promise<BroadcastDTO>
  async scheduleBroadcast(id: string, scheduledAt: string): Promise<BroadcastDTO>
  async sendBroadcast(id: string): Promise<void>
  async cancelBroadcast(id: string): Promise<void>
  async getBroadcastStats(id: string): Promise<BroadcastStats>
}
```

### 3. Repository Layer Components

**Location**: `lib/repositories/`

**Purpose**: Data access abstraction with query optimization and tenant isolation

#### 3.1 Base Repository

**Location**: `lib/repositories/base-repository.ts`

**Interface**:
```typescript
abstract class BaseRepository<T> {
  constructor(
    protected supabase: SupabaseClient,
    protected tableName: string,
    protected tenantId: string
  )
  
  async findById(id: string): Promise<T | null>
  async findAll(filters?: Record<string, unknown>): Promise<T[]>
  async create(data: Partial<T>): Promise<T>
  async update(id: string, data: Partial<T>): Promise<T>
  async delete(id: string): Promise<void>
  
  protected applyTenantFilter(query: any): any
  protected applyPagination(query: any, pagination: Pagination): any
  protected applySorting(query: any, sort: SortOptions): any
}

interface Pagination {
  page: number
  pageSize: number
}

interface SortOptions {
  field: string
  direction: 'asc' | 'desc'
}
```



#### 3.2 Contact Repository

**Location**: `lib/repositories/contact-repository.ts`

**Interface**:
```typescript
class ContactRepository extends BaseRepository<Contact> {
  async findByPhoneNumber(phoneNumber: string): Promise<Contact | null>
  async findByEmail(email: string): Promise<Contact | null>
  async search(query: string): Promise<Contact[]>
  async findByTags(tags: string[]): Promise<Contact[]>
  async bulkCreate(contacts: Partial<Contact>[]): Promise<Contact[]>
  async bulkUpdate(updates: Array<{ id: string; data: Partial<Contact> }>): Promise<void>
}
```

#### 3.3 Message Repository

**Location**: `lib/repositories/message-repository.ts`

**Interface**:
```typescript
class MessageRepository extends BaseRepository<Message> {
  async findByConversation(conversationId: string, pagination: Pagination): Promise<Message[]>
  async findUnread(conversationId: string): Promise<Message[]>
  async markAsRead(messageIds: string[]): Promise<void>
  async getMessageStats(conversationId: string): Promise<MessageStats>
}
```

#### 3.4 Broadcast Repository

**Location**: `lib/repositories/broadcast-repository.ts`

**Interface**:
```typescript
class BroadcastRepository extends BaseRepository<Broadcast> {
  async findScheduled(): Promise<Broadcast[]>
  async findByStatus(status: BroadcastStatus): Promise<Broadcast[]>
  async updateStats(id: string, stats: BroadcastStats): Promise<void>
  async getBroadcastRecipients(id: string): Promise<BroadcastRecipient[]>
}
```

### 4. DTO Layer

**Location**: `lib/dto/`

**Purpose**: Type-safe data transfer objects for API operations

**Structure**:
```typescript
// Input DTOs (for API requests)
export interface CreateContactInput {
  name?: string
  phone_number: string
  email?: string
  notes?: string
  tags?: string[]
}

// Output DTOs (for API responses)
export interface ContactOutput {
  id: string
  name: string | null
  phone_number: string
  email: string | null
  tags: string[]
  created_at: string
  updated_at: string
  // Excludes: tenant_id, internal metadata
}

// Transformation functions
export function toContactOutput(contact: Contact): ContactOutput {
  return {
    id: contact.id,
    name: contact.name,
    phone_number: contact.phone_number,
    email: contact.email,
    tags: contact.tags || [],
    created_at: contact.created_at,
    updated_at: contact.updated_at,
  }
}
```



### 5. Security Infrastructure Components

#### 5.1 Session Manager

**Location**: `lib/security/session-manager.ts`

**Purpose**: Secure session management with Redis storage

**Interface**:
```typescript
interface SessionData {
  userId: string
  tenantId: string
  email: string
  role: string
  permissions: string[]
  createdAt: number
  lastActivity: number
}

class SessionManager {
  async createSession(userId: string, data: SessionData): Promise<string>
  async getSession(sessionId: string): Promise<SessionData | null>
  async updateActivity(sessionId: string): Promise<void>
  async invalidateSession(sessionId: string): Promise<void>
  async invalidateUserSessions(userId: string): Promise<void>
  async cleanupExpiredSessions(): Promise<void>
}
```

**Configuration**:
- Session timeout: 30 minutes inactivity
- Absolute timeout: 24 hours
- Concurrent sessions per user: 5
- Session ID: Cryptographically secure random (32 bytes)
- Storage: Redis with encryption

#### 5.2 Encryption Service

**Location**: `lib/security/encryption-service.ts`

**Purpose**: Data encryption at rest using AES-256

**Interface**:
```typescript
class EncryptionService {
  async encrypt(data: string, tenantId: string): Promise<string>
  async decrypt(encryptedData: string, tenantId: string): Promise<string>
  async encryptObject(obj: Record<string, unknown>, tenantId: string): Promise<string>
  async decryptObject<T>(encryptedData: string, tenantId: string): Promise<T>
  async rotateKeys(tenantId: string): Promise<void>
}
```

**Key Management**:
- Separate encryption keys per tenant
- Keys stored in environment variables or AWS KMS
- Key rotation every 90 days
- Old keys retained for decryption during rotation period

#### 5.3 API Key Manager

**Location**: `lib/security/api-key-manager.ts`

**Purpose**: API key lifecycle management

**Interface**:
```typescript
interface APIKey {
  id: string
  tenant_id: string
  key_prefix: string
  key_hash: string
  name: string
  scopes: string[]
  ip_whitelist: string[]
  expires_at: string | null
  last_used_at: string | null
  created_at: string
}

class APIKeyManager {
  async createAPIKey(tenantId: string, name: string, scopes: string[]): Promise<{ key: string; keyData: APIKey }>
  async validateAPIKey(key: string): Promise<APIKey | null>
  async revokeAPIKey(keyId: string): Promise<void>
  async rotateAPIKey(keyId: string): Promise<{ key: string; keyData: APIKey }>
  async listAPIKeys(tenantId: string): Promise<APIKey[]>
  async updateLastUsed(keyId: string): Promise<void>
}
```

**Implementation**:
- API keys: 32-byte cryptographically random
- Format: `sk_live_<random>` or `sk_test_<random>`
- Storage: bcrypt hash in database
- Scopes: Array of permission keys
- IP whitelist: Optional array of CIDR ranges



#### 5.4 Intrusion Detection System

**Location**: `lib/security/intrusion-detection.ts`

**Purpose**: Real-time detection and prevention of security threats

**Interface**:
```typescript
interface ThreatEvent {
  type: 'brute_force' | 'credential_stuffing' | 'suspicious_pattern' | 'privilege_escalation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  userId?: string
  tenantId?: string
  ip: string
  details: Record<string, unknown>
  timestamp: string
}

interface BlockRule {
  type: 'ip' | 'user' | 'tenant'
  identifier: string
  reason: string
  expiresAt: string
}

class IntrusionDetectionSystem {
  async detectBruteForce(ip: string, userId?: string): Promise<boolean>
  async detectCredentialStuffing(ip: string): Promise<boolean>
  async detectSuspiciousPattern(event: SecurityEvent): Promise<boolean>
  async blockIP(ip: string, duration: number, reason: string): Promise<void>
  async blockUser(userId: string, duration: number, reason: string): Promise<void>
  async isBlocked(type: 'ip' | 'user', identifier: string): Promise<boolean>
  async logThreatEvent(event: ThreatEvent): Promise<void>
  async getActiveThreats(): Promise<ThreatEvent[]>
}
```

**Detection Rules**:
- Brute force: 5 failed login attempts in 5 minutes → 15 minute IP block
- Credential stuffing: 20 failed logins from same IP in 1 hour → 1 hour IP block
- Suspicious patterns: Unusual access patterns, rapid API calls, privilege escalation attempts
- Geo-blocking: Configurable country blocklist
- Bot detection: User-agent analysis, request pattern analysis

#### 5.5 Audit Logger

**Location**: `lib/security/audit-logger.ts`

**Purpose**: Immutable audit trail for compliance

**Interface**:
```typescript
interface AuditLog {
  id: string
  tenant_id: string
  user_id: string
  action: string
  resource_type: string
  resource_id: string
  changes: Record<string, { old: unknown; new: unknown }>
  ip_address: string
  user_agent: string
  timestamp: string
}

class AuditLogger {
  async logAction(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void>
  async queryLogs(filters: AuditLogFilters): Promise<AuditLog[]>
  async exportLogs(tenantId: string, startDate: string, endDate: string): Promise<string>
}

interface AuditLogFilters {
  tenantId?: string
  userId?: string
  action?: string
  resourceType?: string
  startDate?: string
  endDate?: string
}
```

**Logged Actions**:
- Authentication: login, logout, password change, MFA events
- Authorization: permission changes, role assignments
- Data modifications: create, update, delete operations
- API key operations: create, revoke, rotate
- Security events: failed auth, rate limits, suspicious activity
- Admin actions: user management, tenant configuration



#### 5.6 File Storage Service

**Location**: `lib/security/file-storage.ts`

**Purpose**: Secure file upload and storage

**Interface**:
```typescript
interface FileUploadOptions {
  tenantId: string
  userId: string
  file: File
  type: 'image' | 'video' | 'audio' | 'document'
  maxSize?: number
  allowedMimeTypes?: string[]
}

interface StoredFile {
  id: string
  tenant_id: string
  user_id: string
  filename: string
  original_filename: string
  mime_type: string
  size: number
  storage_path: string
  checksum: string
  created_at: string
}

class FileStorageService {
  async uploadFile(options: FileUploadOptions): Promise<StoredFile>
  async getFile(fileId: string, tenantId: string): Promise<StoredFile>
  async getSignedUrl(fileId: string, tenantId: string, expiresIn: number): Promise<string>
  async deleteFile(fileId: string, tenantId: string): Promise<void>
  async scanForMalware(fileId: string): Promise<boolean>
  async validateFile(file: File, options: FileUploadOptions): Promise<boolean>
}
```

**Security Measures**:
- File type validation: MIME type and extension checking
- Size limits: Configurable per file type
- Malware scanning: ClamAV or cloud-based scanning
- Filename sanitization: Remove special characters, prevent path traversal
- Metadata stripping: Remove EXIF and other metadata
- Tenant isolation: Separate storage buckets per tenant
- Access control: Signed URLs with expiration
- Encryption: Files encrypted at rest
- Integrity: SHA-256 checksums

#### 5.7 Webhook Handler

**Location**: `lib/security/webhook-handler.ts`

**Purpose**: Secure webhook processing with signature verification

**Interface**:
```typescript
interface WebhookConfig {
  secret: string
  signatureHeader: string
  algorithm: 'sha256' | 'sha512'
}

interface WebhookPayload {
  id: string
  event: string
  data: Record<string, unknown>
  timestamp: number
}

class WebhookHandler {
  async verifySignature(
    payload: string,
    signature: string,
    config: WebhookConfig
  ): Promise<boolean>
  
  async processWebhook(
    payload: WebhookPayload,
    config: WebhookConfig
  ): Promise<void>
  
  async preventReplay(webhookId: string): Promise<boolean>
  
  async queueWebhook(payload: WebhookPayload): Promise<void>
}
```

**Security Measures**:
- HMAC signature verification
- Replay attack prevention (webhook ID tracking)
- Timestamp validation (reject old webhooks)
- Rate limiting per source
- Async processing via queue
- Idempotency handling
- Timeout protection



### 6. Monitoring and Observability Components

#### 6.1 Performance Monitor

**Location**: `lib/monitoring/performance-monitor.ts`

**Purpose**: Track API performance and identify bottlenecks

**Interface**:
```typescript
interface PerformanceMetric {
  endpoint: string
  method: string
  duration: number
  statusCode: number
  tenantId: string
  userId?: string
  timestamp: string
}

interface PerformanceStats {
  endpoint: string
  avgDuration: number
  p50Duration: number
  p95Duration: number
  p99Duration: number
  requestCount: number
  errorRate: number
}

class PerformanceMonitor {
  async recordMetric(metric: PerformanceMetric): Promise<void>
  async getStats(endpoint: string, timeRange: TimeRange): Promise<PerformanceStats>
  async getSlowQueries(threshold: number): Promise<SlowQuery[]>
  async alertOnThreshold(metric: PerformanceMetric): Promise<void>
}
```

**Metrics Tracked**:
- Response time per endpoint
- Database query execution time
- Cache hit/miss rates
- Error rates per endpoint
- Rate limit violations
- Concurrent request count
- Memory usage
- CPU usage

**Alerting Thresholds**:
- Response time > 1000ms: Warning
- Response time > 3000ms: Critical
- Error rate > 5%: Warning
- Error rate > 10%: Critical
- Cache hit rate < 70%: Warning

#### 6.2 Health Check Service

**Location**: `lib/monitoring/health-check.ts`

**Purpose**: System health monitoring for orchestration

**Interface**:
```typescript
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  checks: {
    database: ComponentHealth
    redis: ComponentHealth
    whatsapp_api: ComponentHealth
    storage: ComponentHealth
  }
}

interface ComponentHealth {
  status: 'up' | 'down' | 'degraded'
  responseTime: number
  message?: string
}

class HealthCheckService {
  async checkHealth(): Promise<HealthStatus>
  async checkDatabase(): Promise<ComponentHealth>
  async checkRedis(): Promise<ComponentHealth>
  async checkExternalAPI(): Promise<ComponentHealth>
  async checkStorage(): Promise<ComponentHealth>
}
```

**Endpoints**:
- `/api/health`: Basic health check (200 if all systems operational)
- `/api/health/ready`: Readiness check for K8s
- `/api/health/live`: Liveness check for K8s



## Data Models

### Enhanced Database Schema

#### Security Tables

**audit_logs**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID,
  changes JSONB,
  ip_address INET NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

**api_keys**
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(20) NOT NULL,
  key_hash TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  ip_whitelist INET[] DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
```

**security_events**
```sql
CREATE TABLE security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES profiles(id),
  event_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  ip_address INET NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_created ON security_events(created_at);
```

**blocked_entities**
```sql
CREATE TABLE blocked_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(20) NOT NULL, -- 'ip', 'user', 'tenant'
  entity_identifier TEXT NOT NULL,
  reason TEXT NOT NULL,
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_blocked_entities_type_id ON blocked_entities(entity_type, entity_identifier);
CREATE INDEX idx_blocked_entities_expires ON blocked_entities(expires_at);
```

**file_uploads**
```sql
CREATE TABLE file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  malware_scanned BOOLEAN DEFAULT FALSE,
  malware_detected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_file_uploads_tenant ON file_uploads(tenant_id);
CREATE INDEX idx_file_uploads_user ON file_uploads(user_id);
```



### Redis Data Structures

#### Rate Limiting
```
Key: rate_limit:{tenant_id}:{endpoint}:{window}
Type: Sorted Set
Value: {timestamp: request_id}
TTL: window duration + 60 seconds
```

#### Session Storage
```
Key: session:{session_id}
Type: Hash
Fields: {
  user_id: string
  tenant_id: string
  email: string
  role: string
  permissions: JSON string
  created_at: timestamp
  last_activity: timestamp
}
TTL: 30 minutes (sliding)
```

#### Cache Storage
```
Key: cache:{tenant_id}:{resource_type}:{resource_id}
Type: String (JSON)
TTL: Varies by resource type (30s - 10m)
```

#### Blocked Entities
```
Key: blocked:ip:{ip_address}
Type: String
Value: {reason, expires_at}
TTL: Block duration

Key: blocked:user:{user_id}
Type: String
Value: {reason, expires_at}
TTL: Block duration
```

#### Webhook Replay Prevention
```
Key: webhook:processed:{webhook_id}
Type: String
Value: timestamp
TTL: 24 hours
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified the following redundancies and consolidations:

**Redundancy Analysis**:
1. Validation properties (1.2, 1.3, 1.4) can be combined into a single comprehensive property about input validation
2. Authentication error responses (2.3, 2.4) are specific examples, not general properties
3. Rate limit examples (3.3, 3.7, 3.8) are specific cases of general rate limiting behavior
4. Cache TTL examples (10.2, 10.3, 10.4) are specific configurations, not general properties
5. Tenant isolation is tested at multiple layers (2.2, 4.10, 5.3, 15.4) - can be consolidated
6. Error sanitization properties (7.5, 7.6, 7.7) can be combined into one comprehensive property
7. XSS prevention properties (27.1, 27.2, 27.3, 27.4) can be combined into comprehensive sanitization property
8. Session security properties (29.2, 29.3, 29.4, 29.5) are specific configurations, not general properties
9. Encryption properties (32.2, 32.3, 32.4) can be combined into one property about sensitive data encryption

**Consolidated Properties**:
After removing redundancies and combining related properties, we have the following testable properties:



### Property 1: Input Validation Rejection

*For any* API endpoint with validation schemas, when invalid input is provided (body, query, or path parameters), the system should reject the request with a 400 status code and sanitized error messages that do not expose internal system details.

**Validates: Requirements 1.2, 1.3, 1.4, 1.5**

### Property 2: Phone Number Format Validation

*For any* phone number input to WhatsApp operations, the system should accept only valid E.164 format phone numbers (matching regex `^\+?[1-9]\d{1,14}$`) and reject all others.

**Validates: Requirements 1.7**

### Property 3: File Upload Validation

*For any* file upload, the system should validate file type against whitelist, validate size against maximum limits, and reject files that fail validation before storage.

**Validates: Requirements 1.8**

### Property 4: String Sanitization

*For any* string input containing SQL injection payloads, XSS payloads, or path traversal attempts, the system should sanitize the input to remove or escape malicious content before processing.

**Validates: Requirements 1.9, 26.4, 26.7, 27.1, 27.2, 27.3, 27.4, 27.8, 27.9**

### Property 5: Length Constraint Enforcement

*For any* text field with maximum length constraints, the system should reject inputs exceeding the limit during validation.

**Validates: Requirements 1.10**

### Property 6: Authentication Requirement

*For any* protected API endpoint, when a request is made without valid authentication, the system should reject the request and return a 401 status code.

**Validates: Requirements 2.1**

### Property 7: Tenant Isolation Enforcement

*For any* authenticated user attempting to access resources, the system should only return resources belonging to that user's tenant and reject attempts to access resources from other tenants with a 403 status code.

**Validates: Requirements 2.2, 4.10, 5.3, 15.4**

### Property 8: Permission-Based Authorization

*For any* API endpoint requiring specific permissions, when a user without the required permission attempts access, the system should reject the request with a 403 status code.

**Validates: Requirements 2.5, 2.9**

### Property 9: Context Injection

*For any* authenticated API request, the middleware should inject user context (user ID, tenant ID, permissions) into the request handler, making it available for business logic.

**Validates: Requirements 2.6, 2.7, 15.1**

### Property 10: RLS Policy Enforcement

*For any* database query, when attempting to access data from a different tenant than the authenticated user's tenant, the Row Level Security policies should prevent the query from returning unauthorized data.

**Validates: Requirements 2.8**

### Property 11: Authentication Failure Logging

*For any* authentication failure (invalid credentials, expired session, missing token), the system should log the event with timestamp, IP address, and user identifier for security monitoring.

**Validates: Requirements 2.10**

### Property 12: Rate Limiting Enforcement

*For any* tenant making requests to an endpoint, when the number of requests exceeds the configured limit within the time window, the system should reject subsequent requests with a 429 status code until the window resets.

**Validates: Requirements 3.1, 3.6**

### Property 13: Rate Limit Headers

*For any* API response, the system should include rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset) indicating the current rate limit status, and when rate limited, include a Retry-After header.

**Validates: Requirements 3.4, 3.10**

### Property 14: Sliding Window Rate Limiting

*For any* sequence of requests within a time window, the rate limiter should use a sliding window algorithm such that requests are counted accurately regardless of when they occur within the window.

**Validates: Requirements 3.5**

### Property 15: Tenant-Specific Rate Limits

*For any* two tenants with different tier configurations, the system should enforce different rate limits per tenant according to their tier settings.

**Validates: Requirements 3.9**

### Property 16: Business Rule Validation

*For any* service operation that violates business rules (e.g., duplicate phone number, invalid state transition), the service layer should reject the operation and throw a domain-specific exception before database access.

**Validates: Requirements 4.4**

### Property 17: Transaction Atomicity

*For any* multi-step service operation, when any step fails, the entire operation should be rolled back, leaving the system in its original state (all changes succeed or all changes fail).

**Validates: Requirements 4.5, 5.7**

### Property 18: Domain Exception Types

*For any* error condition in the service layer, the system should throw typed domain exceptions (ValidationError, AuthenticationError, AuthorizationError, etc.) that can be handled appropriately by error handlers.

**Validates: Requirements 4.6**

### Property 19: Repository CRUD Completeness

*For any* repository implementation, it should provide working create, read, update, and delete operations that correctly interact with the database.

**Validates: Requirements 5.2**

### Property 20: Sensitive Field Exclusion

*For any* API response containing user or system data, sensitive fields (passwords, API keys, internal IDs, encryption keys) should be excluded from the response payload.

**Validates: Requirements 6.5**

### Property 21: DTO Transformation Correctness

*For any* database model, transforming it to a DTO and back should preserve all non-sensitive data fields correctly.

**Validates: Requirements 6.6, 6.7**

### Property 22: Nested and Array Validation

*For any* input containing nested objects or arrays, the validation schema should validate the structure recursively, rejecting invalid nested data.

**Validates: Requirements 6.8, 6.9**

### Property 23: Exception Handling

*For any* unhandled exception thrown in an API route handler, the error handler should catch it, log detailed information, and return a sanitized error response to the client.

**Validates: Requirements 7.1, 7.3**

### Property 24: Error Message Sanitization

*For any* error response, the message should not contain database schema details, file system paths, environment variables, or other internal system information.

**Validates: Requirements 7.2, 7.5, 7.6, 7.7**

### Property 25: Error Status Codes

*For any* error type (validation, authentication, authorization, not found, conflict, server error), the error handler should return the appropriate HTTP status code (400, 401, 403, 404, 409, 500).

**Validates: Requirements 7.4**

### Property 26: Error Codes and Request IDs

*For any* error response, the system should include a machine-readable error code and a unique request ID for tracing.

**Validates: Requirements 7.8, 7.9**

### Property 27: Error Monitoring Integration

*For any* error that occurs, the system should send the error details to the monitoring system (Sentry) for tracking and alerting.

**Validates: Requirements 7.10**

### Property 28: CORS Header Configuration

*For any* API response to a cross-origin request, the system should include appropriate CORS headers (Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers) based on the request origin and endpoint configuration.

**Validates: Requirements 8.1, 8.4, 8.5**

### Property 29: CORS Origin Restriction

*For any* cross-origin request in production, when the origin is not in the whitelist, the system should reject the request by not including CORS headers in the response.

**Validates: Requirements 8.2**

### Property 30: CORS Preflight Handling

*For any* preflight OPTIONS request, the system should respond with appropriate CORS headers and a 200 status code without executing the actual endpoint logic.

**Validates: Requirements 8.6, 8.8**

### Property 31: CORS Violation Logging

*For any* CORS violation (rejected origin, disallowed method), the system should log the event for security monitoring.

**Validates: Requirements 8.10**

### Property 32: Cache-Aside Pattern

*For any* cached resource, when reading the resource, the system should check the cache first, and on cache miss, fetch from the database and store in cache before returning.

**Validates: Requirements 10.5**

### Property 33: Cache Invalidation on Update

*For any* data update operation, the system should invalidate the corresponding cache entries to ensure subsequent reads return fresh data.

**Validates: Requirements 10.6**

### Property 34: Tenant-Specific Cache Keys

*For any* cached data, the cache key should include the tenant ID, ensuring that tenants cannot access each other's cached data.

**Validates: Requirements 10.7**

### Property 35: Cache Graceful Degradation

*For any* operation when Redis is unavailable, the system should continue to function by bypassing the cache and accessing the database directly, without throwing errors.

**Validates: Requirements 10.9**

### Property 36: Cache Metrics Tracking

*For any* cache operation (hit or miss), the system should record metrics that can be queried for monitoring cache performance.

**Validates: Requirements 10.10**

### Property 37: Tenant Isolation in Rate Limiting

*For any* two different tenants, their rate limit counters should be tracked separately such that one tenant's usage does not affect another tenant's rate limits.

**Validates: Requirements 15.8**

### Property 38: Tenant-Specific Metrics

*For any* monitoring metric (performance, errors, usage), the system should record the tenant ID, allowing metrics to be queried per tenant.

**Validates: Requirements 15.9**

### Property 39: Cross-Tenant Access Logging

*For any* attempt to access resources from a different tenant, the system should log the attempt in the audit log with details of the user, requested resource, and denial reason.

**Validates: Requirements 15.10**

### Property 40: SQL Injection Attempt Logging

*For any* input containing SQL injection patterns (UNION, DROP, SELECT, etc. in unexpected contexts), the system should log the attempt as a security event.

**Validates: Requirements 26.10**

### Property 41: Session ID Uniqueness

*For any* set of generated session IDs, each ID should be cryptographically random and unique (no collisions).

**Validates: Requirements 29.1**

### Property 42: Session Regeneration on Auth

*For any* successful authentication, the system should generate a new session ID and invalidate the old session ID to prevent session fixation attacks.

**Validates: Requirements 29.6**

### Property 43: Session Invalidation on Logout

*For any* logout operation, the system should immediately invalidate the session such that subsequent requests with that session ID are rejected.

**Validates: Requirements 29.7**

### Property 44: Concurrent Session Limits

*For any* user, when the number of active sessions exceeds the configured limit, the system should invalidate the oldest session when creating a new one.

**Validates: Requirements 29.9**

### Property 45: Session Event Logging

*For any* session creation or destruction event, the system should log the event with user ID, timestamp, and IP address.

**Validates: Requirements 29.10**

### Property 46: Sensitive Data Encryption

*For any* sensitive data (API keys, tokens, PII) stored in the database, the data should be encrypted using AES-256 before storage and decrypted when retrieved.

**Validates: Requirements 32.2, 32.3, 32.4**

### Property 47: Tenant-Specific Encryption Keys

*For any* two different tenants, their data should be encrypted using different encryption keys such that one tenant's key cannot decrypt another tenant's data.

**Validates: Requirements 32.5**

### Property 48: Encryption Key Rotation

*For any* encryption key rotation operation, the system should be able to decrypt data encrypted with old keys while encrypting new data with the new key.

**Validates: Requirements 32.6**

### Property 49: Encryption Key Non-Exposure

*For any* log entry, error message, or API response, encryption keys should never be included in the output.

**Validates: Requirements 32.8**



## Error Handling

### Error Classification

Errors are classified into the following categories:

1. **Validation Errors** (400)
   - Invalid input format
   - Missing required fields
   - Type mismatches
   - Constraint violations

2. **Authentication Errors** (401)
   - Missing authentication token
   - Invalid credentials
   - Expired session
   - Invalid API key

3. **Authorization Errors** (403)
   - Insufficient permissions
   - Tenant access denied
   - Resource access denied
   - Rate limit exceeded (429)

4. **Not Found Errors** (404)
   - Resource not found
   - Endpoint not found

5. **Conflict Errors** (409)
   - Duplicate resource
   - Concurrent modification
   - State conflict

6. **Server Errors** (500)
   - Database errors
   - External API failures
   - Unexpected exceptions

### Error Response Format

All errors follow a consistent format:

```typescript
interface ErrorResponse {
  error: string          // Error type (e.g., "ValidationError")
  message: string        // User-friendly message
  code: string          // Machine-readable code (e.g., "VAL_001")
  requestId: string     // Unique request identifier
  timestamp: string     // ISO 8601 timestamp
  details?: Array<{     // Optional validation details
    field: string
    message: string
  }>
}
```

### Error Handling Flow

```
1. Exception thrown in handler
   ↓
2. Error Handler catches exception
   ↓
3. Classify error type
   ↓
4. Log detailed error (with stack trace)
   ↓
5. Sanitize error message
   ↓
6. Send to monitoring system (Sentry)
   ↓
7. Return sanitized error response
   ↓
8. Add security headers
   ↓
9. Return to client
```

### Error Sanitization Rules

1. **Never expose**:
   - Database schema details
   - File system paths
   - Environment variables
   - Stack traces
   - Internal service names
   - Encryption keys
   - Session tokens

2. **Always include**:
   - Error type
   - User-friendly message
   - Error code
   - Request ID
   - Timestamp

3. **Conditionally include**:
   - Validation details (only for validation errors)
   - Retry-After header (only for rate limit errors)

### Graceful Degradation

The system implements graceful degradation for dependency failures:

1. **Redis Unavailable**:
   - Rate limiting: Fall back to in-memory rate limiting
   - Caching: Bypass cache, query database directly
   - Sessions: Fall back to JWT-based sessions

2. **Database Slow**:
   - Return cached data if available
   - Implement query timeouts
   - Return partial results with warning

3. **External API Failure**:
   - Implement circuit breaker pattern
   - Return cached data if available
   - Queue operations for retry
   - Return error with retry guidance

4. **File Storage Unavailable**:
   - Queue uploads for retry
   - Return error with retry guidance
   - Use fallback storage if configured



## Testing Strategy

### Dual Testing Approach

The system requires both unit testing and property-based testing for comprehensive coverage:

**Unit Tests**: Verify specific examples, edge cases, and error conditions
**Property Tests**: Verify universal properties across all inputs

Together, these approaches provide comprehensive coverage where unit tests catch concrete bugs and property tests verify general correctness.

### Property-Based Testing

**Library**: `fast-check` for TypeScript/JavaScript

**Configuration**:
- Minimum 100 iterations per property test (due to randomization)
- Each property test must reference its design document property
- Tag format: `Feature: security-optimization, Property {number}: {property_text}`

**Example Property Test**:
```typescript
import fc from 'fast-check'
import { describe, it } from 'vitest'

describe('Feature: security-optimization, Property 1: Input Validation Rejection', () => {
  it('should reject invalid input with 400 status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string(),
          phone_number: fc.string().filter(s => !s.match(/^\+?[1-9]\d{1,14}$/)),
          email: fc.option(fc.emailAddress())
        }),
        async (invalidInput) => {
          const response = await fetch('/api/contacts', {
            method: 'POST',
            body: JSON.stringify(invalidInput),
            headers: { 'Authorization': 'Bearer valid-token' }
          })
          
          expect(response.status).toBe(400)
          const body = await response.json()
          expect(body.error).toBeDefined()
          expect(body.code).toBeDefined()
          // Verify no internal details exposed
          expect(body.message).not.toMatch(/database|schema|table|column/i)
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

### Unit Testing

**Framework**: Vitest

**Coverage Requirements**:
- Minimum 80% code coverage
- 100% coverage for security-critical paths
- All error paths tested

**Test Categories**:

1. **Middleware Tests**:
   - Authentication success/failure
   - Authorization with different permissions
   - Rate limiting behavior
   - Input validation with specific payloads
   - Error handling

2. **Service Layer Tests**:
   - Business logic validation
   - Transaction rollback on failure
   - Domain exception throwing
   - Tenant isolation

3. **Repository Layer Tests**:
   - CRUD operations
   - Query filtering
   - Pagination
   - Transaction support

4. **Security Tests**:
   - SQL injection prevention
   - XSS prevention
   - CSRF protection
   - Session management
   - Encryption/decryption

5. **Integration Tests**:
   - End-to-end API flows
   - Multi-tenant scenarios
   - External API integration
   - Database integration

### Test Data Generation

**Generators for Property Tests**:

```typescript
// Valid phone numbers
const validPhoneArb = fc.string().map(s => 
  '+' + fc.integer({ min: 1, max: 9 }).toString() + 
  fc.integer({ min: 1000000000, max: 99999999999999 }).toString()
)

// Invalid phone numbers
const invalidPhoneArb = fc.oneof(
  fc.string().filter(s => !s.match(/^\+?[1-9]\d{1,14}$/)),
  fc.constant(''),
  fc.constant('invalid'),
  fc.constant('123') // too short
)

// SQL injection payloads
const sqlInjectionArb = fc.oneof(
  fc.constant("'; DROP TABLE users; --"),
  fc.constant("1' OR '1'='1"),
  fc.constant("admin'--"),
  fc.constant("' UNION SELECT * FROM passwords--")
)

// XSS payloads
const xssPayloadArb = fc.oneof(
  fc.constant("<script>alert('xss')</script>"),
  fc.constant("<img src=x onerror=alert('xss')>"),
  fc.constant("javascript:alert('xss')"),
  fc.constant("<svg onload=alert('xss')>")
)

// Path traversal payloads
const pathTraversalArb = fc.oneof(
  fc.constant("../../etc/passwd"),
  fc.constant("..\\..\\windows\\system32"),
  fc.constant("....//....//etc/passwd")
)
```

### Mocking Strategy

**External Dependencies**:
- Supabase: Mock with MSW (Mock Service Worker)
- Redis: Mock with ioredis-mock
- WhatsApp API: Mock with MSW
- File storage: Mock with in-memory storage

**Example Mock**:
```typescript
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

const server = setupServer(
  http.post('https://api.supabase.io/rest/v1/contacts', () => {
    return HttpResponse.json({ id: '123', name: 'Test' })
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

### CI/CD Integration

**Pipeline Steps**:
1. Lint code (ESLint with security rules)
2. Type check (TypeScript strict mode)
3. Run unit tests
4. Run property tests
5. Run integration tests
6. Check code coverage (minimum 80%)
7. Security scan (npm audit, Snyk)
8. Build application
9. Deploy to staging
10. Run E2E tests
11. Deploy to production

**Security Gates**:
- Fail build on critical vulnerabilities
- Fail build on coverage below 80%
- Fail build on security test failures
- Require security review for auth/crypto changes



## Deployment Architecture

### Infrastructure Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Load Balancer                            │
│                    (TLS Termination, DDoS Protection)            │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js Application                         │
│                    (Multiple Instances, Auto-scaling)            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Middleware Layer (Auth, Rate Limit, Validation)         │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  API Routes → Services → Repositories                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                 ┌───────────────┼───────────────┐
                 ▼               ▼               ▼
        ┌────────────┐  ┌────────────┐  ┌────────────┐
        │  Supabase  │  │   Redis    │  │   File     │
        │ PostgreSQL │  │  (Upstash) │  │  Storage   │
        │   (RLS)    │  │            │  │ (Supabase) │
        └────────────┘  └────────────┘  └────────────┘
                 │               │               │
                 └───────────────┼───────────────┘
                                 ▼
                        ┌────────────────┐
                        │   Monitoring   │
                        │ (Sentry, Logs) │
                        └────────────────┘
```

### Environment Configuration

**Development**:
- Local Next.js dev server
- Local Supabase (Docker)
- Local Redis (Docker)
- Relaxed CORS
- Detailed error messages
- Lower rate limits

**Staging**:
- Vercel deployment
- Supabase staging project
- Upstash Redis staging
- Production-like configuration
- Moderate rate limits
- Sanitized error messages

**Production**:
- Vercel deployment with auto-scaling
- Supabase production project
- Upstash Redis production
- Strict CORS
- Sanitized error messages
- Production rate limits
- TLS 1.3 enforced
- Security headers enforced

### Scaling Strategy

**Horizontal Scaling**:
- Next.js: Auto-scale based on CPU/memory (Vercel handles this)
- Redis: Upstash provides automatic scaling
- Database: Supabase connection pooling (PgBouncer)

**Vertical Scaling**:
- Database: Upgrade Supabase plan for more resources
- Redis: Upgrade Upstash plan for more memory

**Caching Strategy**:
- Edge caching: Vercel Edge Network
- Application caching: Redis
- Database caching: Supabase built-in caching

### Security Configuration

**Network Security**:
- TLS 1.3 for all connections
- DDoS protection via Vercel
- IP-based rate limiting
- Geo-blocking for high-risk countries (optional)

**Application Security**:
- Security headers on all responses
- CORS restricted to whitelisted domains
- CSRF protection on state-changing operations
- Input validation on all endpoints
- Output sanitization on all responses

**Data Security**:
- Encryption at rest (Supabase)
- Encryption in transit (TLS)
- Field-level encryption for sensitive data
- Separate encryption keys per tenant
- Regular key rotation

**Access Control**:
- Row-Level Security (RLS) in database
- RBAC in application layer
- API key authentication for external access
- Session management with Redis
- Concurrent session limits

### Monitoring and Alerting

**Metrics**:
- Response time per endpoint
- Error rate per endpoint
- Rate limit violations
- Cache hit/miss rates
- Database query performance
- Memory and CPU usage

**Alerts**:
- Error rate > 5%: Warning
- Error rate > 10%: Critical
- Response time > 1s: Warning
- Response time > 3s: Critical
- Security events: Immediate
- Rate limit violations: Warning
- Database connection failures: Critical

**Logging**:
- Structured JSON logs
- Request/response logging
- Security event logging
- Audit logging
- Error logging with stack traces
- Performance logging

**Tools**:
- Sentry: Error tracking and alerting
- Vercel Analytics: Performance monitoring
- Supabase Logs: Database query logging
- Custom dashboard: Real-time metrics

### Backup and Recovery

**Database Backups**:
- Automated daily backups (Supabase)
- Point-in-time recovery (7 days)
- Manual backup before major changes
- Backup encryption
- Backup retention: 30 days

**Redis Backups**:
- Upstash automatic persistence
- Snapshot backups
- Recovery from snapshot

**Disaster Recovery**:
- RTO (Recovery Time Objective): 1 hour
- RPO (Recovery Point Objective): 1 hour
- Documented recovery procedures
- Regular recovery drills
- Multi-region failover (future)

### Compliance

**GDPR Compliance**:
- Data export functionality
- Data deletion functionality
- Consent management
- Privacy policy acceptance tracking
- Data retention policies
- Data processing agreements

**Security Compliance**:
- Regular security audits
- Penetration testing (quarterly)
- Vulnerability scanning (continuous)
- Security incident response plan
- Compliance documentation



## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)

**Goal**: Establish core security infrastructure

**Tasks**:
1. Enhanced withAuth middleware with rate limiting
2. Input validation schemas (Zod)
3. Error handler with sanitization
4. Security headers middleware
5. Request logging
6. Basic audit logging

**Deliverables**:
- Enhanced middleware layer
- Validation schemas for core entities
- Centralized error handling
- Security headers on all responses
- Request logging infrastructure

**Testing**:
- Unit tests for middleware
- Property tests for validation
- Integration tests for auth flow

### Phase 2: Service and Repository Layers (Weeks 3-4)

**Goal**: Implement layered architecture

**Tasks**:
1. Base service and repository classes
2. Contact service and repository
3. Message service and repository
4. Broadcast service and repository
5. DTO definitions and transformations
6. Transaction management

**Deliverables**:
- Service layer for core domains
- Repository layer for data access
- DTO layer for type safety
- Transaction support

**Testing**:
- Unit tests for services
- Unit tests for repositories
- Property tests for tenant isolation
- Integration tests for transactions

### Phase 3: Security Infrastructure (Weeks 5-6)

**Goal**: Implement advanced security features

**Tasks**:
1. Session manager with Redis
2. Encryption service
3. API key manager
4. Intrusion detection system
5. File storage service
6. Webhook handler

**Deliverables**:
- Secure session management
- Data encryption at rest
- API key lifecycle management
- Intrusion detection and blocking
- Secure file uploads
- Webhook signature verification

**Testing**:
- Unit tests for security components
- Property tests for encryption
- Security penetration testing
- Integration tests for IDS

### Phase 4: Monitoring and Compliance (Weeks 7-8)

**Goal**: Implement observability and compliance features

**Tasks**:
1. Performance monitoring
2. Health check endpoints
3. Enhanced audit logging
4. GDPR compliance features
5. Security scanning integration
6. Documentation

**Deliverables**:
- Performance monitoring dashboard
- Health check endpoints
- Comprehensive audit logs
- Data export/deletion APIs
- Security scanning in CI/CD
- API documentation (OpenAPI)

**Testing**:
- Integration tests for monitoring
- E2E tests for compliance features
- Load testing
- Security audit

### Phase 5: Migration and Optimization (Weeks 9-10)

**Goal**: Migrate existing code and optimize performance

**Tasks**:
1. Migrate existing API routes to new architecture
2. Update frontend to use new APIs
3. Performance optimization
4. Cache tuning
5. Query optimization
6. Load testing

**Deliverables**:
- All API routes migrated
- Frontend updated
- Performance benchmarks met
- Cache hit rates optimized
- Query performance optimized

**Testing**:
- Regression testing
- Performance testing
- Load testing
- User acceptance testing

## Technology Choices and Justifications

### Input Validation: Zod

**Why Zod**:
- TypeScript-first with excellent type inference
- Runtime validation with compile-time types
- Composable schemas
- Clear error messages
- Wide adoption in Next.js ecosystem

**Alternatives Considered**:
- Yup: Less TypeScript-friendly
- Joi: Node.js focused, not TypeScript-first
- AJV: JSON Schema based, less ergonomic

### Rate Limiting: Redis + Upstash

**Why Redis**:
- Distributed rate limiting across instances
- Atomic operations for accurate counting
- TTL support for automatic cleanup
- High performance

**Why Upstash**:
- Serverless-friendly (REST API)
- Auto-scaling
- Global replication
- Pay-per-request pricing

**Alternatives Considered**:
- In-memory: Not distributed
- Database: Too slow
- Redis Labs: More expensive

### Property Testing: fast-check

**Why fast-check**:
- TypeScript support
- Shrinking for minimal failing examples
- Async property support
- Good documentation
- Active maintenance

**Alternatives Considered**:
- JSVerify: Less maintained
- testcheck-js: Less TypeScript support
- QuickCheck (Haskell): Different language

### Session Management: Redis

**Why Redis**:
- Fast session lookup
- Automatic expiration (TTL)
- Distributed across instances
- Atomic operations

**Alternatives Considered**:
- JWT only: No server-side revocation
- Database: Too slow for every request
- Memory: Not distributed

### Encryption: Node.js crypto

**Why Node.js crypto**:
- Built-in, no dependencies
- AES-256 support
- Well-tested
- FIPS compliant

**Alternatives Considered**:
- bcrypt: For passwords only
- Third-party libraries: Unnecessary dependency

### File Storage: Supabase Storage

**Why Supabase Storage**:
- Integrated with existing Supabase setup
- RLS support
- Signed URLs
- CDN integration
- Automatic image optimization

**Alternatives Considered**:
- AWS S3: More complex setup
- Cloudinary: Additional service
- Local storage: Not scalable

### Monitoring: Sentry

**Why Sentry**:
- Already integrated
- Excellent error tracking
- Performance monitoring
- Release tracking
- Alerting

**Alternatives Considered**:
- DataDog: More expensive
- New Relic: More complex
- Custom solution: Too much effort

### API Documentation: OpenAPI 3.0

**Why OpenAPI**:
- Industry standard
- Tool ecosystem (Swagger UI, Postman)
- Code generation support
- TypeScript integration

**Alternatives Considered**:
- GraphQL: Different paradigm
- Custom docs: More maintenance
- API Blueprint: Less adoption

## Migration Path to NestJS (Future)

The architecture is designed to facilitate future migration to NestJS:

**Current Architecture → NestJS Mapping**:
- Middleware Layer → NestJS Guards and Interceptors
- Service Layer → NestJS Services (already compatible)
- Repository Layer → NestJS Repositories (already compatible)
- DTO Layer → NestJS DTOs (already compatible)
- Validation Schemas → NestJS Pipes with class-validator

**Migration Benefits**:
- Dependency injection built-in
- Decorator-based routing
- Better testing utilities
- Microservices support
- GraphQL support

**Migration Challenges**:
- Next.js App Router specific features
- Server components integration
- Build process changes
- Deployment changes

**Recommendation**: Maintain current Next.js architecture until:
1. Team size grows (>10 developers)
2. Microservices needed
3. GraphQL required
4. More complex backend logic needed



## Security Architecture Diagrams

### Authentication Flow

```
┌─────────┐                                    ┌──────────────┐
│ Client  │                                    │   Supabase   │
└────┬────┘                                    │     Auth     │
     │                                         └──────┬───────┘
     │ 1. POST /api/auth/login                       │
     │    { email, password }                        │
     ├──────────────────────────────────────────────►│
     │                                                │
     │                                         2. Verify credentials
     │                                                │
     │                                         3. Generate session
     │                                                │
     │ 4. Return session token                       │
     │◄───────────────────────────────────────────────┤
     │                                                │
     │ 5. Store token in cookie                      │
     │                                                │
     │ 6. GET /api/contacts                          │
     │    Cookie: session=token                      │
     ├──────────────────────────────────────────────►│
     │                                                │
     │                                         7. Validate session
     │                                                │
     │                                         8. Get user profile
     │                                                │
     │ 9. Return user context                        │
     │◄───────────────────────────────────────────────┤
     │                                                │
```

### Rate Limiting Flow

```
┌─────────┐         ┌──────────────┐         ┌─────────┐
│ Client  │         │  Rate Limiter│         │  Redis  │
└────┬────┘         └──────┬───────┘         └────┬────┘
     │                     │                      │
     │ 1. API Request      │                      │
     ├────────────────────►│                      │
     │                     │                      │
     │                     │ 2. Check limit       │
     │                     ├─────────────────────►│
     │                     │                      │
     │                     │ 3. Get count         │
     │                     │◄─────────────────────┤
     │                     │                      │
     │                     │ 4. Increment counter │
     │                     ├─────────────────────►│
     │                     │                      │
     │                     │ 5. Return new count  │
     │                     │◄─────────────────────┤
     │                     │                      │
     │ 6. Allow/Deny       │                      │
     │◄────────────────────┤                      │
     │                     │                      │
```

### Tenant Isolation Flow

```
┌─────────┐         ┌──────────────┐         ┌──────────────┐
│ User A  │         │  Middleware  │         │  Repository  │
│Tenant 1 │         └──────┬───────┘         └──────┬───────┘
└────┬────┘                │                        │
     │                     │                        │
     │ 1. GET /api/contacts│                        │
     ├────────────────────►│                        │
     │                     │                        │
     │                     │ 2. Extract tenant_id=1 │
     │                     │                        │
     │                     │ 3. Query with filter   │
     │                     ├───────────────────────►│
     │                     │   WHERE tenant_id=1    │
     │                     │                        │
     │                     │ 4. Return data         │
     │                     │◄───────────────────────┤
     │                     │   (only tenant 1)      │
     │                     │                        │
     │ 5. Response         │                        │
     │◄────────────────────┤                        │
     │                     │                        │
     │                     │                        │
┌─────────┐                │                        │
│ User B  │                │                        │
│Tenant 2 │                │                        │
└────┬────┘                │                        │
     │                     │                        │
     │ 6. GET /api/contacts│                        │
     ├────────────────────►│                        │
     │                     │                        │
     │                     │ 7. Extract tenant_id=2 │
     │                     │                        │
     │                     │ 8. Query with filter   │
     │                     ├───────────────────────►│
     │                     │   WHERE tenant_id=2    │
     │                     │                        │
     │                     │ 9. Return data         │
     │                     │◄───────────────────────┤
     │                     │   (only tenant 2)      │
     │                     │                        │
     │ 10. Response        │                        │
     │◄────────────────────┤                        │
     │                     │                        │
```

### Error Handling Flow

```
┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Client  │    │   API    │    │  Error   │    │  Sentry  │
│         │    │  Route   │    │ Handler  │    │          │
└────┬────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
     │              │               │               │
     │ 1. Request   │               │               │
     ├─────────────►│               │               │
     │              │               │               │
     │              │ 2. Process    │               │
     │              │               │               │
     │              │ 3. Exception! │               │
     │              ├──────────────►│               │
     │              │               │               │
     │              │               │ 4. Log error  │
     │              │               ├──────────────►│
     │              │               │               │
     │              │               │ 5. Sanitize   │
     │              │               │               │
     │              │ 6. Sanitized  │               │
     │              │◄──────────────┤               │
     │              │               │               │
     │ 7. Error     │               │               │
     │   Response   │               │               │
     │◄─────────────┤               │               │
     │              │               │               │
```

## Summary

This design document specifies a comprehensive security and optimization architecture for the WhatsApp CRM system. The key improvements include:

**Security Enhancements**:
- Multi-layer defense-in-depth approach
- Input validation with Zod schemas
- Rate limiting with Redis
- Enhanced authentication and authorization
- Intrusion detection and prevention
- Audit logging for compliance
- Data encryption at rest and in transit
- Secure file storage and webhook handling

**Architecture Improvements**:
- Layered architecture (Middleware → Service → Repository)
- Separation of concerns
- Dependency injection ready
- Migration-ready for NestJS
- Testable components

**Performance Optimizations**:
- Redis caching strategy
- Query optimization
- Connection pooling
- Graceful degradation
- Horizontal scaling support

**Operational Excellence**:
- Comprehensive monitoring
- Health check endpoints
- Structured logging
- Error tracking
- Performance metrics
- Automated alerting

**Compliance**:
- GDPR-ready features
- Audit logging
- Data export/deletion
- Consent management
- Security scanning

The implementation is designed to be incremental, allowing for phased rollout without breaking existing functionality. Each phase builds on the previous one, with comprehensive testing at each stage.

The architecture maintains the Next.js stack while preparing for potential future migration to NestJS, ensuring the system can scale with the organization's needs.

