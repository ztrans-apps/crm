# Security Architecture

## Overview

The WhatsApp CRM system implements defense-in-depth security with multiple layers of protection:

1. **Network Layer**: HTTPS/TLS encryption, CORS policies, security headers
2. **Application Layer**: Authentication, authorization, input validation, rate limiting
3. **Data Layer**: Encryption at rest, tenant isolation, RLS policies
4. **Monitoring Layer**: Audit logging, intrusion detection, performance monitoring

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  (Browser, Mobile App, API Client)                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Network Security                         │
│  • HTTPS/TLS 1.3                                            │
│  • CORS Policies                                            │
│  • Security Headers (CSP, HSTS, X-Frame-Options)           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Middleware Layer                           │
│  • Authentication (JWT, API Keys)                           │
│  • Authorization (RBAC, Permissions)                        │
│  • Rate Limiting (Redis-based)                              │
│  • Input Validation (Zod schemas)                           │
│  • Request Logging                                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  • Business Logic                                           │
│  • Transaction Management                                   │
│  • Audit Logging                                            │
│  • Tenant Isolation                                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Repository Layer                           │
│  • Data Access                                              │
│  • Query Optimization                                       │
│  • RLS Enforcement                                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                               │
│  • PostgreSQL (Supabase)                                    │
│  • Row-Level Security (RLS)                                 │
│  • Encryption at Rest (AES-256)                             │
│  • Tenant Isolation                                         │
└─────────────────────────────────────────────────────────────┘
```

## Security Components

### 1. Authentication

- **JWT Tokens**: Stateless authentication with short-lived tokens (15 minutes)
- **Refresh Tokens**: Long-lived tokens (7 days) for token renewal
- **API Keys**: For service-to-service authentication
- **Session Management**: Redis-based session storage with encryption

### 2. Authorization

- **Role-Based Access Control (RBAC)**: Users assigned to roles with specific permissions
- **Permission Checks**: Every endpoint validates user permissions
- **Tenant Isolation**: Multi-tenant architecture with strict data isolation
- **Row-Level Security (RLS)**: Database-level access control

### 3. Input Validation

- **Zod Schemas**: Type-safe validation for all API inputs
- **Sanitization**: SQL injection, XSS, and path traversal prevention
- **Phone Number Validation**: E.164 format enforcement
- **File Upload Validation**: MIME type and size restrictions

### 4. Rate Limiting

- **Sliding Window Algorithm**: Accurate rate limiting using Redis
- **Tiered Limits**: Different limits for different endpoint categories
- **Graceful Degradation**: Falls back to in-memory limiting if Redis unavailable
- **Rate Limit Headers**: X-RateLimit-* headers in all responses

### 5. Encryption

- **Data at Rest**: AES-256 encryption for sensitive data
- **Data in Transit**: TLS 1.3 for all communications
- **Tenant-Specific Keys**: Separate encryption keys per tenant
- **Key Rotation**: Automated key rotation every 90 days

### 6. Intrusion Detection

- **Brute Force Detection**: 5 failed login attempts → 15 minute IP block
- **Credential Stuffing Detection**: 20 failed logins from same IP → 1 hour block
- **Suspicious Pattern Detection**: Anomaly detection for unusual behavior
- **Threat Event Logging**: All security events logged for analysis

### 7. Audit Logging

- **Immutable Logs**: Audit logs cannot be modified or deleted
- **Comprehensive Coverage**: All security-relevant actions logged
- **Retention**: 7-year retention for compliance
- **Sensitive Data Protection**: Passwords, tokens, and keys never logged

## Threat Model

### Threats Addressed

1. **SQL Injection**: Input validation, parameterized queries, ORM usage
2. **Cross-Site Scripting (XSS)**: Input sanitization, CSP headers, output encoding
3. **Cross-Site Request Forgery (CSRF)**: SameSite cookies, CSRF tokens
4. **Authentication Bypass**: Strong authentication, session management, MFA support
5. **Authorization Bypass**: RBAC, permission checks, RLS policies
6. **Brute Force Attacks**: Rate limiting, account lockout, CAPTCHA
7. **Data Breaches**: Encryption, tenant isolation, access controls
8. **Man-in-the-Middle**: TLS 1.3, HSTS, certificate pinning
9. **Denial of Service**: Rate limiting, resource limits, graceful degradation
10. **Insider Threats**: Audit logging, least privilege, separation of duties

### Security Controls

| Threat | Control | Implementation |
|--------|---------|----------------|
| SQL Injection | Input Validation | Zod schemas, parameterized queries |
| XSS | Output Encoding | React auto-escaping, CSP headers |
| CSRF | Token Validation | SameSite cookies, CSRF tokens |
| Brute Force | Rate Limiting | Redis-based sliding window |
| Data Breach | Encryption | AES-256 at rest, TLS 1.3 in transit |
| MITM | TLS | TLS 1.3, HSTS, certificate pinning |
| DoS | Rate Limiting | Tiered rate limits, resource quotas |
| Privilege Escalation | RBAC | Permission checks, RLS policies |

## Compliance

### GDPR Compliance

- **Right to Access (Article 15)**: Data export API
- **Right to Erasure (Article 17)**: Data deletion API
- **Right to Data Portability (Article 20)**: JSON export format
- **Consent Management (Article 7)**: Consent tracking and management
- **Data Retention (Article 5)**: Automated cleanup of expired data
- **Audit Trail (Article 30)**: Comprehensive audit logging

### Security Standards

- **OWASP Top 10**: All vulnerabilities addressed
- **CWE Top 25**: Common weaknesses mitigated
- **NIST Cybersecurity Framework**: Controls aligned with framework
- **ISO 27001**: Information security management practices

## Security Testing

### Automated Testing

- **Unit Tests**: 80% code coverage minimum
- **Property-Based Tests**: 49 correctness properties tested
- **Integration Tests**: End-to-end security flows
- **Security Scanning**: npm audit, Snyk, CodeQL, Trivy

### Manual Testing

- **Penetration Testing**: Annual third-party penetration tests
- **Code Reviews**: Security-focused code reviews for all changes
- **Threat Modeling**: Regular threat modeling sessions
- **Security Audits**: Quarterly security audits

## Incident Response

See [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) for detailed incident response procedures.

## Security Best Practices

See [SECURITY_BEST_PRACTICES.md](./SECURITY_BEST_PRACTICES.md) for developer guidelines.
