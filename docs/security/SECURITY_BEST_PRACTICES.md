# Security Best Practices for Developers

## Overview

This document provides security guidelines for developers working on the WhatsApp CRM system.

## General Principles

### 1. Defense in Depth

Implement multiple layers of security controls:
- Never rely on a single security mechanism
- Validate at every layer (client, middleware, service, database)
- Assume every layer can be compromised

### 2. Least Privilege

Grant minimum necessary permissions:
- Users should have only the permissions they need
- Services should run with minimal privileges
- Database connections should use restricted accounts

### 3. Fail Securely

Handle errors safely:
- Don't expose internal details in error messages
- Log errors securely
- Fail closed (deny access) rather than open

### 4. Secure by Default

Make the secure choice the default:
- Encryption enabled by default
- Strict validation by default
- Deny access by default

## Authentication and Authorization

### Authentication

**DO:**
```typescript
// Use strong password hashing
import bcrypt from 'bcrypt'
const hashedPassword = await bcrypt.hash(password, 12)

// Validate JWT tokens
const token = await verifyJWT(authHeader)
if (!token) {
  throw new AuthenticationError('Invalid token')
}

// Implement session timeout
const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes
```

**DON'T:**
```typescript
// Never store passwords in plain text
const password = user.password // ❌

// Never use weak hashing
const hash = md5(password) // ❌

// Never skip token validation
const userId = decodeJWT(token).userId // ❌ No verification
```

### Authorization

**DO:**
```typescript
// Check permissions before every action
await requirePermission(user, 'contacts:write')

// Validate tenant access
await validateTenantAccess(user.tenantId, resource.tenantId)

// Use RBAC consistently
if (!user.hasRole('admin')) {
  throw new AuthorizationError('Admin access required')
}
```

**DON'T:**
```typescript
// Never trust client-side authorization
if (req.body.isAdmin) { // ❌ Client can manipulate this
  // grant admin access
}

// Never skip permission checks
const contact = await getContact(id) // ❌ No permission check
```

## Input Validation

### Validation Rules

**DO:**
```typescript
// Use Zod schemas for validation
import { z } from 'zod'

const CreateContactSchema = z.object({
  name: z.string().min(1).max(100),
  phone_number: z.string().regex(/^\+[1-9]\d{1,14}$/),
  email: z.string().email().optional(),
})

// Validate all inputs
const validated = CreateContactSchema.parse(input)

// Sanitize strings
import { sanitizeString } from '@/lib/middleware/input-validator'
const clean = sanitizeString(userInput)
```

**DON'T:**
```typescript
// Never trust user input
const query = `SELECT * FROM users WHERE id = ${req.params.id}` // ❌ SQL injection

// Never skip validation
const contact = await createContact(req.body) // ❌ No validation

// Never use eval or similar
eval(userInput) // ❌ Code injection
new Function(userInput)() // ❌ Code injection
```

### SQL Injection Prevention

**DO:**
```typescript
// Use parameterized queries
const { data } = await supabase
  .from('contacts')
  .select('*')
  .eq('id', contactId) // ✅ Parameterized

// Use ORM/query builder
const contact = await repository.findById(id) // ✅ Safe
```

**DON'T:**
```typescript
// Never concatenate SQL
const query = `SELECT * FROM contacts WHERE name = '${name}'` // ❌

// Never use raw queries with user input
await supabase.rpc('raw_query', { sql: userInput }) // ❌
```

### XSS Prevention

**DO:**
```typescript
// React auto-escapes by default
<div>{userInput}</div> // ✅ Safe

// Use DOMPurify for HTML
import DOMPurify from 'dompurify'
const clean = DOMPurify.sanitize(html)

// Set CSP headers
Content-Security-Policy: default-src 'self'
```

**DON'T:**
```typescript
// Never use dangerouslySetInnerHTML without sanitization
<div dangerouslySetInnerHTML={{ __html: userInput }} /> // ❌

// Never disable React escaping
<div>{eval(userInput)}</div> // ❌
```

## Sensitive Data Handling

### Encryption

**DO:**
```typescript
// Encrypt sensitive data at rest
import { EncryptionService } from '@/lib/security/encryption-service'
const encrypted = await encryptionService.encrypt(sensitiveData)

// Use HTTPS for all communications
// Enforce TLS 1.3 minimum

// Rotate encryption keys regularly
await encryptionService.rotateKeys()
```

**DON'T:**
```typescript
// Never store sensitive data in plain text
const apiKey = 'sk_live_abc123' // ❌ Store encrypted

// Never log sensitive data
console.log('Password:', password) // ❌
logger.info('API Key:', apiKey) // ❌

// Never send sensitive data in URLs
fetch(`/api/reset?token=${resetToken}`) // ❌ Use POST body
```

### Secrets Management

**DO:**
```typescript
// Use environment variables
const apiKey = process.env.API_KEY

// Use secret management services
// AWS Secrets Manager, HashiCorp Vault, etc.

// Rotate secrets regularly
// Implement automated rotation
```

**DON'T:**
```typescript
// Never commit secrets to git
const API_KEY = 'sk_live_abc123' // ❌

// Never hardcode credentials
const db = connect('postgresql://user:pass@host/db') // ❌

// Never share secrets in code comments
// API Key: sk_live_abc123 // ❌
```

## Error Handling

### Secure Error Messages

**DO:**
```typescript
// Return generic error messages to clients
catch (error) {
  logger.error('Database error:', error) // Log details
  return { error: 'An error occurred' } // Generic message
}

// Use error codes
return {
  error: 'Validation failed',
  code: 'VAL_001',
  request_id: requestId
}
```

**DON'T:**
```typescript
// Never expose internal details
catch (error) {
  return { error: error.message } // ❌ May expose SQL, paths, etc.
}

// Never expose stack traces
catch (error) {
  return { error: error.stack } // ❌ Exposes code structure
}
```

## Rate Limiting

**DO:**
```typescript
// Implement rate limiting on all endpoints
import { RateLimiter } from '@/lib/middleware/rate-limiter'

const limiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
})

// Use different limits for different endpoints
const authLimiter = new RateLimiter({ max: 5 }) // Stricter for auth
```

**DON'T:**
```typescript
// Never skip rate limiting on sensitive endpoints
app.post('/api/login', loginHandler) // ❌ No rate limiting

// Never use client-side rate limiting only
// Always enforce server-side
```

## Audit Logging

**DO:**
```typescript
// Log all security-relevant actions
await auditLogger.logAction({
  tenant_id: tenantId,
  user_id: userId,
  action: 'contact.delete',
  resource_type: 'contact',
  resource_id: contactId,
})

// Log authentication attempts
await auditLogger.logAction({
  action: 'auth.login',
  success: true,
  ip_address: req.ip,
})
```

**DON'T:**
```typescript
// Never log sensitive data
await auditLogger.logAction({
  action: 'user.update',
  changes: { password: newPassword } // ❌
})

// Never skip logging for security events
await deleteUser(userId) // ❌ No audit log
```

## Dependency Management

**DO:**
```bash
# Keep dependencies up to date
npm audit
npm audit fix

# Use lock files
npm ci # Use package-lock.json

# Review dependencies before adding
npm view package-name
```

**DON'T:**
```bash
# Never ignore security warnings
npm audit --force # ❌

# Never use outdated dependencies
# Check for updates regularly

# Never install unverified packages
npm install random-package # ❌ Review first
```

## Testing

**DO:**
```typescript
// Write security tests
describe('Authentication', () => {
  it('should reject invalid tokens', async () => {
    const response = await request(app)
      .get('/api/contacts')
      .set('Authorization', 'Bearer invalid')
    
    expect(response.status).toBe(401)
  })
})

// Test authorization
it('should prevent cross-tenant access', async () => {
  // Test that user from tenant A cannot access tenant B data
})

// Use property-based testing
fc.assert(
  fc.asyncProperty(
    fc.string(),
    async (input) => {
      // Test that all inputs are properly sanitized
    }
  )
)
```

## Code Review Checklist

### Security Review Points

- [ ] Authentication implemented correctly
- [ ] Authorization checks present
- [ ] Input validation using Zod schemas
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (proper escaping)
- [ ] CSRF protection (tokens, SameSite cookies)
- [ ] Rate limiting implemented
- [ ] Sensitive data encrypted
- [ ] Secrets not hardcoded
- [ ] Error messages don't expose internals
- [ ] Audit logging for security events
- [ ] Tenant isolation enforced
- [ ] Tests cover security scenarios

## Resources

### Tools

- **ESLint Security Plugin**: `eslint-plugin-security`
- **Secret Scanning**: `detect-secrets`
- **Dependency Scanning**: `npm audit`, Snyk
- **SAST**: CodeQL, SonarQube
- **DAST**: OWASP ZAP, Burp Suite

### References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

## Questions?

Contact the security team:
- Email: security@example.com
- Slack: #security
