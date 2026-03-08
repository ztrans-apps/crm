import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { InputValidator } from '@/lib/middleware/input-validator'
import { RequestLogger } from '@/lib/middleware/request-logger'

/**
 * Property-Based Tests for SQL Injection Attempt Logging
 * 
 * **Validates: Requirements 26.10**
 * 
 * These tests verify that the InputValidator correctly detects and logs SQL injection
 * attempts as security events. The system should log all suspected SQL injection attempts
 * for security analysis and incident response.
 * 
 * Property 40: SQL Injection Attempt Logging
 * For any input containing SQL injection patterns (UNION, DROP, SELECT, etc. in unexpected
 * contexts), the system should log the attempt as a security event.
 */

describe('Feature: security-optimization, Property 40: SQL Injection Attempt Logging', () => {
  // Mock the RequestLogger.logSecurityEvent method
  let logSecurityEventSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Spy on the logSecurityEvent method
    logSecurityEventSpy = vi.spyOn(RequestLogger, 'logSecurityEvent')
  })

  afterEach(() => {
    // Restore the original implementation
    logSecurityEventSpy.mockRestore()
  })

  /**
   * Property Test: SQL injection attempts should be logged as security events
   * 
   * Tests that when SQL injection patterns are detected in input:
   * 1. The attempt is logged as a security event
   * 2. The event type is 'suspicious_activity'
   * 3. The event details include attack_type: 'sql_injection'
   * 4. The event details include the payload (truncated to 200 chars)
   * 5. The event details include detected pattern names
   * 
   * **Validates: Requirements 26.10**
   */
  it('should log SQL injection attempts as security events', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // UNION-based injection
          fc.constant("' UNION SELECT * FROM users --"),
          fc.constant("1' UNION SELECT password FROM users WHERE '1'='1"),
          fc.constant("admin' UNION SELECT NULL, username, password FROM users --"),
          
          // DROP TABLE attacks
          fc.constant("'; DROP TABLE users; --"),
          fc.constant("1'; DROP TABLE contacts; DROP TABLE messages; --"),
          fc.constant("test'; DROP DATABASE crm; --"),
          
          // Comment-based injection
          fc.constant("admin' --"),
          fc.constant("admin'/*"),
          
          // OR-based authentication bypass
          fc.constant("' OR '1'='1"),
          fc.constant("' OR 1=1 --"),
          fc.constant("admin' OR '1'='1' --"),
          
          // AND-based injection
          fc.constant("' AND 1=1 --"),
          fc.constant("1' AND '1'='1"),
          
          // INSERT/UPDATE/DELETE injection
          fc.constant("'; INSERT INTO users VALUES ('hacker', 'pass'); --"),
          fc.constant("'; UPDATE users SET role='admin' WHERE id=1; --"),
          fc.constant("'; DELETE FROM users WHERE '1'='1'; --"),
          
          // EXEC/EXECUTE injection
          fc.constant("'; EXEC xp_cmdshell('dir'); --"),
          fc.constant("'; EXECUTE sp_executesql N'DROP TABLE users'; --"),
          
          // Semicolon chaining
          fc.constant("test; SELECT * FROM users"),
          fc.constant("value'; SELECT password FROM users WHERE username='admin"),
          
          // Mixed case to test case-insensitivity
          fc.constant("' UnIoN SeLeCt * FrOm users --"),
          fc.constant("'; dRoP tAbLe contacts; --"),
          
          // Generate random SQL injection patterns
          fc.record({
            prefix: fc.oneof(fc.constant("'"), fc.constant("1'"), fc.constant("admin'")),
            keyword: fc.oneof(
              fc.constant(" UNION SELECT "),
              fc.constant(" DROP TABLE "),
              fc.constant(" OR 1=1 "),
              fc.constant(" AND 1=1 "),
              fc.constant("; DELETE FROM ")
            ),
            suffix: fc.oneof(fc.constant(" --"), fc.constant(""), fc.constant(" /*"))
          }).map(({ prefix, keyword, suffix }) => prefix + keyword + "users" + suffix)
        ),
        async (sqlInjectionPayload) => {
          // Clear previous calls
          logSecurityEventSpy.mockClear()
          
          // Sanitize the input (which should trigger logging)
          const context = {
            userId: 'test-user-123',
            tenantId: 'test-tenant-456',
            ip: '192.168.1.100'
          }
          
          InputValidator.sanitizeString(sqlInjectionPayload, context)
          
          // Verify that logSecurityEvent was called
          expect(logSecurityEventSpy).toHaveBeenCalled()
          
          // Get the logged event
          const loggedEvent = logSecurityEventSpy.mock.calls[0]?.[0]
          
          // Verify event structure
          expect(loggedEvent).toBeDefined()
          expect(loggedEvent.type).toBe('suspicious_activity')
          expect(loggedEvent.userId).toBe(context.userId)
          expect(loggedEvent.tenantId).toBe(context.tenantId)
          expect(loggedEvent.ip).toBe(context.ip)
          
          // Verify event details
          expect(loggedEvent.details).toBeDefined()
          expect(loggedEvent.details.attack_type).toBe('sql_injection')
          expect(loggedEvent.details.payload).toBeDefined()
          expect(typeof loggedEvent.details.payload).toBe('string')
          
          // Verify payload is truncated to 200 chars max
          expect(loggedEvent.details.payload.length).toBeLessThanOrEqual(200)
          
          // Verify detected patterns are included
          expect(loggedEvent.details.detected_patterns).toBeDefined()
          expect(Array.isArray(loggedEvent.details.detected_patterns)).toBe(true)
          expect(loggedEvent.details.detected_patterns.length).toBeGreaterThan(0)
          
          // Verify timestamp is present
          expect(loggedEvent.timestamp).toBeDefined()
          expect(typeof loggedEvent.timestamp).toBe('string')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: Legitimate input should not trigger SQL injection logging
   * 
   * Tests that normal, legitimate input does not trigger false positive
   * SQL injection detection and logging.
   * 
   * **Validates: Requirements 26.10**
   */
  it('should not log legitimate input as SQL injection', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Normal text
          fc.constant("Hello, this is a normal message"),
          fc.constant("Welcome to our CRM system!"),
          fc.constant("Contact us at support@example.com"),
          
          // Valid URLs
          fc.constant("Visit https://example.com for more info"),
          fc.constant("Check out http://blog.example.com/article"),
          
          // Email addresses
          fc.constant("Send email to john.doe@example.com"),
          fc.constant("Contact: admin@company.org"),
          
          // Phone numbers
          fc.constant("Call us at +1234567890"),
          fc.constant("Phone: +44 20 1234 5678"),
          
          // Alphanumeric with punctuation
          fc.constant("Order #12345 has been shipped!"),
          fc.constant("Your account balance is $1,234.56"),
          
          // Words that contain SQL keywords but are not injection attempts
          fc.constant("I need to select a new phone"),
          fc.constant("Please update my contact information"),
          fc.constant("Can you insert this into the calendar?"),
          fc.constant("I want to drop by the office tomorrow"),
          fc.constant("Let's delete the old files"),
          
          // Generate random legitimate text
          fc.string({ minLength: 5, maxLength: 100 }).filter(s => {
            // Filter out strings that contain SQL injection patterns
            const lower = s.toLowerCase()
            return !lower.match(/union.*select/i) &&
                   !lower.match(/drop.*table/i) &&
                   !lower.match(/insert.*into/i) &&
                   !lower.match(/delete.*from/i) &&
                   !lower.match(/update.*set/i) &&
                   !lower.includes('--') &&
                   !lower.includes('/*') &&
                   !lower.match(/;.*(select|insert|update|delete|drop)/i)
          })
        ),
        async (legitimateInput) => {
          // Clear previous calls
          logSecurityEventSpy.mockClear()
          
          // Sanitize the input
          const context = {
            userId: 'test-user-123',
            tenantId: 'test-tenant-456',
            ip: '192.168.1.100'
          }
          
          InputValidator.sanitizeString(legitimateInput, context)
          
          // Verify that logSecurityEvent was NOT called
          expect(logSecurityEventSpy).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: SQL injection detection should work without context
   * 
   * Tests that SQL injection detection and logging works even when
   * context (userId, tenantId, ip) is not provided. The IP should
   * default to 'unknown' in this case.
   * 
   * **Validates: Requirements 26.10**
   */
  it('should log SQL injection attempts even without context', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant("' UNION SELECT * FROM users --"),
        async (sqlInjectionPayload) => {
          // Clear previous calls
          logSecurityEventSpy.mockClear()
          
          // Sanitize without context
          InputValidator.sanitizeString(sqlInjectionPayload)
          
          // Verify that logSecurityEvent was called
          expect(logSecurityEventSpy).toHaveBeenCalled()
          
          // Get the logged event
          const loggedEvent = logSecurityEventSpy.mock.calls[0]?.[0]
          
          // Verify event structure
          expect(loggedEvent).toBeDefined()
          expect(loggedEvent.type).toBe('suspicious_activity')
          
          // IP should default to 'unknown'
          expect(loggedEvent.ip).toBe('unknown')
          
          // userId and tenantId should be undefined
          expect(loggedEvent.userId).toBeUndefined()
          expect(loggedEvent.tenantId).toBeUndefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: Multiple SQL injection patterns should be detected
   * 
   * Tests that when input contains multiple SQL injection patterns,
   * all detected patterns are included in the logged event details.
   * 
   * **Validates: Requirements 26.10**
   */
  it('should detect and log multiple SQL injection patterns', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Multiple patterns in one payload
          fc.constant("' UNION SELECT * FROM users; DROP TABLE contacts; --"),
          fc.constant("admin' OR 1=1; DELETE FROM users WHERE '1'='1"),
          fc.constant("'; INSERT INTO users VALUES ('x'); UPDATE users SET role='admin'; --")
        ),
        async (multiPatternPayload) => {
          // Clear previous calls
          logSecurityEventSpy.mockClear()
          
          // Sanitize the input
          const context = {
            userId: 'test-user-123',
            tenantId: 'test-tenant-456',
            ip: '192.168.1.100'
          }
          
          InputValidator.sanitizeString(multiPatternPayload, context)
          
          // Verify that logSecurityEvent was called
          expect(logSecurityEventSpy).toHaveBeenCalled()
          
          // Get the logged event
          const loggedEvent = logSecurityEventSpy.mock.calls[0]?.[0]
          
          // Verify multiple patterns were detected
          expect(loggedEvent.details.detected_patterns).toBeDefined()
          expect(Array.isArray(loggedEvent.details.detected_patterns)).toBe(true)
          expect(loggedEvent.details.detected_patterns.length).toBeGreaterThan(1)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: detectSqlInjection method should correctly identify SQL injection
   * 
   * Tests the detectSqlInjection method directly to ensure it correctly
   * identifies SQL injection patterns.
   * 
   * **Validates: Requirements 26.10**
   */
  it('should correctly detect SQL injection patterns', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant("' UNION SELECT * FROM users --"),
          fc.constant("'; DROP TABLE users; --"),
          fc.constant("' OR '1'='1"),
          fc.constant("'; DELETE FROM users; --"),
          fc.constant("'; EXEC xp_cmdshell('dir'); --")
        ),
        async (sqlInjectionPayload) => {
          // Test detection method directly
          const isDetected = InputValidator.detectSqlInjection(sqlInjectionPayload)
          
          // Should detect SQL injection
          expect(isDetected).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: detectSqlInjection should not flag legitimate input
   * 
   * Tests that the detectSqlInjection method does not produce false positives
   * for legitimate input.
   * 
   * **Validates: Requirements 26.10**
   */
  it('should not detect SQL injection in legitimate input', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant("Hello, this is a normal message"),
          fc.constant("I need to select a new phone"),
          fc.constant("Please update my contact information"),
          fc.constant("Can you insert this into the calendar?")
        ),
        async (legitimateInput) => {
          // Test detection method directly
          const isDetected = InputValidator.detectSqlInjection(legitimateInput)
          
          // Should NOT detect SQL injection
          expect(isDetected).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: Long SQL injection payloads should be truncated in logs
   * 
   * Tests that very long SQL injection payloads are truncated to 200 characters
   * in the logged event to prevent log bloat.
   * 
   * **Validates: Requirements 26.10**
   */
  it('should truncate long SQL injection payloads in logs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 250, maxLength: 500 }).map(s => 
          "' UNION SELECT * FROM users WHERE name='" + s + "' --"
        ),
        async (longPayload) => {
          // Clear previous calls
          logSecurityEventSpy.mockClear()
          
          // Sanitize the input
          const context = {
            userId: 'test-user-123',
            tenantId: 'test-tenant-456',
            ip: '192.168.1.100'
          }
          
          InputValidator.sanitizeString(longPayload, context)
          
          // Verify that logSecurityEvent was called
          expect(logSecurityEventSpy).toHaveBeenCalled()
          
          // Get the logged event
          const loggedEvent = logSecurityEventSpy.mock.calls[0]?.[0]
          
          // Verify payload is truncated to 200 chars
          expect(loggedEvent.details.payload.length).toBeLessThanOrEqual(200)
          
          // Verify it's actually truncated (original was longer)
          expect(longPayload.length).toBeGreaterThan(200)
        }
      ),
      { numRuns: 100 }
    )
  })
})
