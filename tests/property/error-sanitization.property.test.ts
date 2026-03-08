import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { ErrorHandler, AppError } from '@/lib/middleware/error-handler'

/**
 * Property-Based Tests for Error Message Sanitization
 * 
 * **Validates: Requirements 7.2, 7.5, 7.6, 7.7**
 * 
 * These tests verify that the ErrorHandler correctly sanitizes error messages to prevent
 * information disclosure. Error responses should never contain:
 * - Database schema details (table names, column names, SQL syntax)
 * - File system paths (Unix or Windows paths)
 * - Environment variables (process.env references)
 * - Stack traces in production
 * - Internal system details
 * 
 * The tests ensure that sensitive information is removed while maintaining useful error messages.
 */

describe('Feature: security-optimization, Property 24: Error Message Sanitization', () => {
  /**
   * Property Test: Database schema details should not be exposed in error messages
   * 
   * Tests that error messages containing database-related information are sanitized:
   * - SQL keywords (SELECT, INSERT, UPDATE, DELETE, FROM, WHERE, JOIN, TABLE)
   * - Database-specific terms (postgres, supabase, relation, constraint)
   * - Schema details (foreign key, primary key, unique constraint)
   * - Table and column names
   * 
   * **Validates: Requirements 7.2, 7.6**
   */
  it('should not expose database schema details in error messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // SQL syntax errors
          fc.constant("Error: SELECT * FROM users WHERE id = 1 failed"),
          fc.constant("Database error: INSERT INTO contacts (name, phone) VALUES failed"),
          fc.constant("Query failed: UPDATE messages SET status = 'read' WHERE id = 123"),
          fc.constant("Error executing: DELETE FROM conversations WHERE tenant_id = 456"),
          
          // PostgreSQL/Supabase specific errors
          fc.constant("Error: relation 'public.users' does not exist"),
          fc.constant("PostgreSQL error: duplicate key value violates unique constraint 'users_email_key'"),
          fc.constant("Supabase error: foreign key constraint 'messages_conversation_id_fkey' violated"),
          fc.constant("pg_query failed: column 'tenant_id' does not exist in table 'contacts'"),
          
          // Constraint violations
          fc.constant("Error: duplicate key value violates unique constraint"),
          fc.constant("Foreign key constraint violation on table 'messages'"),
          fc.constant("Check constraint 'phone_number_format' violated"),
          fc.constant("Not null constraint failed for column 'tenant_id'"),
          
          // Table and column references
          fc.constant("Error in table 'users': column 'password_hash' cannot be null"),
          fc.constant("Invalid column name 'api_key' in table 'tenants'"),
          fc.constant("Table 'conversations' does not have column 'metadata'"),
          
          // Generate random database error patterns
          fc.record({
            operation: fc.oneof(
              fc.constant("SELECT"),
              fc.constant("INSERT"),
              fc.constant("UPDATE"),
              fc.constant("DELETE")
            ),
            table: fc.oneof(
              fc.constant("users"),
              fc.constant("contacts"),
              fc.constant("messages"),
              fc.constant("conversations")
            ),
            detail: fc.oneof(
              fc.constant("failed"),
              fc.constant("does not exist"),
              fc.constant("constraint violated")
            )
          }).map(({ operation, table, detail }) => 
            `Database error: ${operation} on table '${table}' ${detail}`
          )
        ),
        async (databaseError) => {
          const error = new Error(databaseError)
          const requestId = 'test-request-id'
          const sanitized = ErrorHandler.sanitizeError(error, requestId)
          
          const lowerMessage = sanitized.message.toLowerCase()
          
          // SQL keywords should not be exposed
          expect(lowerMessage).not.toMatch(/\b(select|insert|update|delete|from|where|join)\b/i)
          
          // Database-specific terms should not be exposed
          expect(lowerMessage).not.toMatch(/\b(postgres|postgresql|supabase|pg_|relation)\b/i)
          
          // Constraint details should not be exposed
          expect(lowerMessage).not.toMatch(/\b(constraint|foreign key|primary key|unique constraint)\b/i)
          
          // Table names should not be exposed
          expect(lowerMessage).not.toMatch(/\b(users|contacts|messages|conversations|tenants)\b/i)
          expect(lowerMessage).not.toContain("table '")
          expect(lowerMessage).not.toContain('table "')
          
          // Column names should not be exposed
          expect(lowerMessage).not.toMatch(/\b(column|tenant_id|password|api_key|metadata)\b/i)
          expect(lowerMessage).not.toContain("column '")
          expect(lowerMessage).not.toContain('column "')
          
          // Should return a generic message (database errors are treated as programming errors)
          // The ErrorHandler returns a completely generic message for database errors
          expect(lowerMessage).toMatch(/database error|unexpected error/i)
        }
      ),
      { numRuns: 2 }
    )
  })


  /**
   * Property Test: File system paths should not be exposed in error messages
   * 
   * Tests that error messages containing file paths are sanitized:
   * - Unix-style paths (/home/user/app, /var/log, /etc)
   * - Windows-style paths (C:\Users\, D:\app\)
   * - Relative paths (../config, ./lib)
   * - Node.js module paths
   * 
   * **Validates: Requirements 7.2, 7.7**
   */
  it('should not expose file system paths in error messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Unix absolute paths
          fc.constant("Error: Cannot read file /home/user/app/config/database.yml"),
          fc.constant("File not found: /var/www/crm/lib/services/contact-service.ts"),
          fc.constant("Permission denied: /etc/secrets/api-keys.json"),
          fc.constant("Error loading /usr/local/app/.env"),
          
          // Windows absolute paths
          fc.constant("Error: Cannot access C:\\Users\\Admin\\app\\config\\secrets.json"),
          fc.constant("File error: D:\\Projects\\CRM\\lib\\middleware\\auth.ts"),
          fc.constant("Path not found: C:\\Program Files\\App\\database.db"),
          
          // Relative paths
          fc.constant("Error in ../config/database.yml"),
          fc.constant("Cannot load ./lib/services/message-service.ts"),
          fc.constant("Module not found: ../../node_modules/package"),
          
          // Node.js specific paths
          fc.constant("Error in /app/node_modules/@supabase/supabase-js/dist/index.js"),
          fc.constant("Module error: /home/node/app/dist/lib/middleware/error-handler.js"),
          fc.constant("Stack trace: at /app/lib/repositories/contact-repository.ts:45:12"),
          
          // Mixed path formats
          fc.constant("Error: File /home/user/app/.env.local not accessible"),
          fc.constant("Cannot read C:\\app\\config\\production.json"),
          
          // Generate random path errors
          fc.record({
            prefix: fc.oneof(
              fc.constant("/home/user/"),
              fc.constant("/var/"),
              fc.constant("C:\\Users\\"),
              fc.constant("../")
            ),
            path: fc.oneof(
              fc.constant("app/config/database.yml"),
              fc.constant("secrets/.env"),
              fc.constant("lib/services/auth.ts"),
              fc.constant(".env.production")
            )
          }).map(({ prefix, path }) => `Error accessing file: ${prefix}${path}`)
        ),
        async (pathError) => {
          const error = new Error(pathError)
          const requestId = 'test-request-id'
          const sanitized = ErrorHandler.sanitizeError(error, requestId)
          
          const message = sanitized.message
          
          // Unix paths should be sanitized
          expect(message).not.toMatch(/\/[\w\-./]+/g)
          expect(message).not.toContain('/home/')
          expect(message).not.toContain('/var/')
          expect(message).not.toContain('/etc/')
          expect(message).not.toContain('/usr/')
          expect(message).not.toContain('/app/')
          
          // Windows paths should be sanitized
          expect(message).not.toMatch(/[A-Z]:\\[\w\-\\]+/g)
          expect(message).not.toContain('C:\\')
          expect(message).not.toContain('D:\\')
          
          // Relative paths should be sanitized
          expect(message).not.toContain('../')
          expect(message).not.toContain('./')
          
          // File extensions that might reveal structure should be sanitized
          expect(message).not.toMatch(/\.(ts|js|yml|yaml|json|env)/)
          
          // Should contain [path] placeholder or generic message
          expect(message).toMatch(/\[path\]|unexpected error/i)
        }
      ),
      { numRuns: 2 }
    )
  })


  /**
   * Property Test: Environment variables should not be exposed in error messages
   * 
   * Tests that error messages containing environment variable references are sanitized:
   * - process.env.VARIABLE_NAME
   * - ${VARIABLE_NAME} syntax
   * - $VARIABLE_NAME syntax
   * - Common secret variable names
   * 
   * **Validates: Requirements 7.2, 7.7**
   */
  it('should not expose environment variables in error messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // process.env references
          fc.constant("Error: process.env.DATABASE_URL is not defined"),
          fc.constant("Missing configuration: process.env.SUPABASE_KEY"),
          fc.constant("Invalid value for process.env.API_SECRET"),
          fc.constant("Cannot access process.env.REDIS_PASSWORD"),
          
          // Template literal syntax
          fc.constant("Error: ${DATABASE_URL} is required"),
          fc.constant("Missing ${SUPABASE_SERVICE_KEY} in configuration"),
          fc.constant("Invalid ${API_KEY} provided"),
          
          // Shell variable syntax
          fc.constant("Error: $DATABASE_URL not set"),
          fc.constant("Missing $SUPABASE_ANON_KEY"),
          fc.constant("Cannot read $REDIS_URL"),
          
          // Common secret variable names
          fc.constant("Error: DATABASE_URL is undefined"),
          fc.constant("Missing SUPABASE_SERVICE_KEY"),
          fc.constant("Invalid API_SECRET_KEY"),
          fc.constant("REDIS_PASSWORD not configured"),
          fc.constant("JWT_SECRET is required"),
          fc.constant("ENCRYPTION_KEY not found"),
          
          // Generate random env var errors
          fc.record({
            syntax: fc.oneof(
              fc.constant("process.env."),
              fc.constant("${"),
              fc.constant("$")
            ),
            varName: fc.oneof(
              fc.constant("DATABASE_URL"),
              fc.constant("API_KEY"),
              fc.constant("SECRET_KEY"),
              fc.constant("PASSWORD"),
              fc.constant("TOKEN")
            )
          }).map(({ syntax, varName }) => {
            if (syntax === "${") {
              return `Error: ${syntax}${varName}} is not defined`
            }
            return `Error: ${syntax}${varName} is not defined`
          })
        ),
        async (envError) => {
          const error = new Error(envError)
          const requestId = 'test-request-id'
          const sanitized = ErrorHandler.sanitizeError(error, requestId)
          
          const message = sanitized.message
          
          // process.env references should be sanitized
          expect(message).not.toContain('process.env')
          
          // Template literal syntax should be sanitized
          expect(message).not.toMatch(/\$\{?\w+\}?/)
          
          // Common secret variable names should be sanitized
          expect(message).not.toMatch(/\b(DATABASE_URL|API_KEY|SECRET|PASSWORD|TOKEN|SUPABASE|REDIS)\b/i)
          
          // Should contain [env] placeholder or generic message
          expect(message).toMatch(/\[env\]|unexpected error/i)
        }
      ),
      { numRuns: 2 }
    )
  })


  /**
   * Property Test: Stack traces should not be exposed in production error messages
   * 
   * Tests that error messages containing stack trace information are sanitized:
   * - "at" keyword followed by file paths
   * - Line and column numbers
   * - Function names with file locations
   * - Full stack traces
   * 
   * **Validates: Requirements 7.2, 7.5**
   */
  it('should not expose stack traces in error messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Stack trace lines
          fc.constant("Error: Something failed\n    at ContactService.createContact (/app/lib/services/contact-service.ts:45:12)"),
          fc.constant("TypeError: Cannot read property 'id' of undefined\n    at /app/lib/repositories/message-repository.ts:123:5"),
          fc.constant("Error\n    at async handler (/app/app/api/contacts/route.ts:34:7)"),
          
          // Single line stack references
          fc.constant("Error at /home/user/app/lib/middleware/auth.ts:67:15"),
          fc.constant("Failed at ContactRepository.findById (/app/lib/repositories/contact-repository.ts:89:10)"),
          fc.constant("Exception in /var/www/app/lib/services/broadcast-service.ts line 156"),
          
          // Multiple stack frames
          fc.constant(`Error: Database connection failed
    at DatabaseClient.connect (/app/lib/database/client.ts:23:11)
    at ContactRepository.query (/app/lib/repositories/contact-repository.ts:45:20)
    at ContactService.getContact (/app/lib/services/contact-service.ts:78:15)`),
          
          // Line and column numbers
          fc.constant("Error at line 45, column 12 in contact-service.ts"),
          fc.constant("Exception at contact-repository.ts:123:5"),
          fc.constant("Failed at auth.ts:67:15"),
          
          // Generate random stack trace patterns
          fc.record({
            file: fc.oneof(
              fc.constant("contact-service.ts"),
              fc.constant("message-repository.ts"),
              fc.constant("auth.ts"),
              fc.constant("error-handler.ts")
            ),
            line: fc.integer({ min: 1, max: 500 }),
            col: fc.integer({ min: 1, max: 80 })
          }).map(({ file, line, col }) => 
            `Error at /app/lib/${file}:${line}:${col}`
          )
        ),
        async (stackTraceError) => {
          const error = new Error(stackTraceError)
          const requestId = 'test-request-id'
          const sanitized = ErrorHandler.sanitizeError(error, requestId)
          
          const message = sanitized.message
          
          // "at" keyword with file paths should be removed
          expect(message).not.toMatch(/\s+at\s+[\w./\\]+/i)
          
          // File paths with line:column should be removed
          expect(message).not.toMatch(/[\w\-./\\]+\.ts:\d+:\d+/)
          expect(message).not.toMatch(/[\w\-./\\]+\.js:\d+:\d+/)
          
          // Line and column references should be removed
          expect(message).not.toMatch(/line\s+\d+/i)
          expect(message).not.toMatch(/column\s+\d+/i)
          
          // File paths should be sanitized
          expect(message).not.toMatch(/\/[\w\-./]+\.(ts|js)/)
          
          // Should not contain newlines with stack frames
          expect(message).not.toMatch(/\n\s+at\s+/)
        }
      ),
      { numRuns: 2 }
    )
  })


  /**
   * Property Test: IP addresses and ports should be sanitized in error messages
   * 
   * Tests that error messages containing network information are sanitized:
   * - IPv4 addresses
   * - IPv6 addresses
   * - Port numbers
   * - Connection strings
   * 
   * **Validates: Requirements 7.2, 7.7**
   */
  it('should sanitize IP addresses and ports in error messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // IPv4 addresses
          fc.constant("Error: Cannot connect to database at 192.168.1.100"),
          fc.constant("Connection refused: 10.0.0.5:5432"),
          fc.constant("Redis error: Failed to connect to 127.0.0.1:6379"),
          fc.constant("API request failed: http://172.16.0.10:3000/api/users"),
          
          // IPv6 addresses
          fc.constant("Error connecting to [2001:0db8:85a3:0000:0000:8a2e:0370:7334]"),
          fc.constant("Cannot reach [::1]:8080"),
          fc.constant("Connection to [fe80::1]:5432 failed"),
          
          // Connection strings with credentials
          fc.constant("Error: postgres://user:pass@localhost:5432/database failed"),
          fc.constant("Redis connection failed: redis://admin:secret@10.0.0.5:6379"),
          
          // Port numbers
          fc.constant("Error: Port 5432 is already in use"),
          fc.constant("Cannot bind to port 3000"),
          fc.constant("Connection refused on port 6379"),
          
          // Generate random IP errors
          fc.record({
            ip: fc.tuple(
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 }),
              fc.integer({ min: 0, max: 255 })
            ).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
            port: fc.integer({ min: 1000, max: 65535 })
          }).map(({ ip, port }) => `Error: Cannot connect to ${ip}:${port}`)
        ),
        async (networkError) => {
          const error = new Error(networkError)
          const requestId = 'test-request-id'
          const sanitized = ErrorHandler.sanitizeError(error, requestId)
          
          const message = sanitized.message
          
          // IPv4 addresses should be sanitized
          expect(message).not.toMatch(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/)
          
          // IPv6 addresses should be sanitized
          expect(message).not.toMatch(/\b([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/)
          expect(message).not.toMatch(/\[[\da-fA-F:]+\]/)
          
          // Port numbers should be sanitized
          expect(message).not.toMatch(/:\d{2,5}\b/)
          expect(message).not.toMatch(/port\s+\d+/i)
          
          // Connection strings should be sanitized
          expect(message).not.toMatch(/postgres:\/\//)
          expect(message).not.toMatch(/redis:\/\//)
          expect(message).not.toMatch(/http:\/\/\d/)
          
          // Should contain [ip] or [port] placeholders or generic message
          expect(message).toMatch(/\[ip\]|\[port\]|unexpected error/i)
        }
      ),
      { numRuns: 2 }
    )
  })


  /**
   * Property Test: API keys and tokens should be sanitized in error messages
   * 
   * Tests that error messages containing sensitive credentials are sanitized:
   * - Long alphanumeric strings (potential tokens)
   * - API key patterns
   * - JWT tokens
   * - Bearer tokens
   * 
   * **Validates: Requirements 7.2, 7.7**
   */
  it('should sanitize API keys and tokens in error messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // API keys (using fake patterns that don't match real key formats)
          fc.constant("Error: Invalid API key: test_key_1234567890abcdefghijklmnopqrstuvwxyz"),
          fc.constant("Authentication failed with key: demo_test_abcdefghijklmnopqrstuvwxyz123456"),
          fc.constant("API key test_aBcDeFgHiJkLmNoPqRsTuVwXyZ123456789 is expired"),
          
          // JWT tokens
          fc.constant("Error: Invalid token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U"),
          fc.constant("JWT verification failed: eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxMjMifQ.abcdefghijklmnopqrstuvwxyz"),
          
          // Bearer tokens
          fc.constant("Error: Bearer token abcdefghijklmnopqrstuvwxyz1234567890 is invalid"),
          fc.constant("Authorization failed: Bearer 1234567890abcdefghijklmnopqrstuvwxyz"),
          
          // Long alphanumeric strings (potential secrets)
          fc.constant("Error: Secret key a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0 is invalid"),
          fc.constant("Invalid credential: 0123456789abcdefghijklmnopqrstuvwxyz"),
          
          // Generate random token-like errors
          fc.record({
            prefix: fc.oneof(
              fc.constant("sk_live_"),
              fc.constant("pk_test_"),
              fc.constant("Bearer "),
              fc.constant("")
            ),
            token: fc.string({ minLength: 32, maxLength: 64 }).filter(s => /^[a-zA-Z0-9]+$/.test(s))
          }).map(({ prefix, token }) => `Error: Invalid token ${prefix}${token}`)
        ),
        async (tokenError) => {
          const error = new Error(tokenError)
          const requestId = 'test-request-id'
          const sanitized = ErrorHandler.sanitizeError(error, requestId)
          
          const message = sanitized.message
          
          // Long alphanumeric strings (32+ chars) should be sanitized
          expect(message).not.toMatch(/\b[a-zA-Z0-9_-]{32,}\b/)
          
          // API key prefixes should be sanitized
          expect(message).not.toMatch(/sk_live_/)
          expect(message).not.toMatch(/pk_test_/)
          expect(message).not.toMatch(/sk_test_/)
          
          // JWT tokens should be sanitized
          expect(message).not.toMatch(/eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+/)
          
          // Bearer tokens should be sanitized
          expect(message).not.toMatch(/Bearer\s+[a-zA-Z0-9_-]{20,}/)
          
          // Should contain [token] placeholder or generic message
          expect(message).toMatch(/\[token\]|unexpected error/i)
        }
      ),
      { numRuns: 2 }
    )
  })


  /**
   * Property Test: Email addresses should be sanitized in error messages
   * 
   * Tests that error messages containing email addresses are sanitized:
   * - Standard email formats
   * - Email addresses in error contexts
   * 
   * **Validates: Requirements 7.2, 7.7**
   */
  it('should sanitize email addresses in error messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Email addresses in errors
          fc.constant("Error: User admin@company.com not found"),
          fc.constant("Duplicate email: john.doe@example.com already exists"),
          fc.constant("Cannot send to invalid.email@test.org"),
          fc.constant("Authentication failed for user support@crm-system.com"),
          
          // Generate random email errors
          fc.record({
            localPart: fc.stringMatching(/^[a-z0-9.]{3,10}$/),
            domain: fc.oneof(
              fc.constant("example.com"),
              fc.constant("test.org"),
              fc.constant("company.net")
            )
          }).map(({ localPart, domain }) => `Error: Email ${localPart}@${domain} is invalid`)
        ),
        async (emailError) => {
          const error = new Error(emailError)
          const requestId = 'test-request-id'
          const sanitized = ErrorHandler.sanitizeError(error, requestId)
          
          const message = sanitized.message
          
          // Email addresses should be sanitized
          expect(message).not.toMatch(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)
          
          // Should contain [email] placeholder or generic message
          expect(message).toMatch(/\[email\]|unexpected error/i)
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Operational errors should have sanitized messages
   * 
   * Tests that known operational errors (AppError instances) have their messages sanitized
   * to remove sensitive information while still being somewhat informative:
   * - Database table names should be removed
   * - Email addresses should be removed
   * - User IDs and specific identifiers should be removed
   * - Regex patterns should be removed
   * 
   * **Validates: Requirements 7.2, 7.3**
   */
  it('should sanitize operational errors while maintaining usefulness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Validation error with regex pattern
          fc.constant({
            message: "Invalid input: field 'email' must match pattern /^[a-z]+@[a-z]+\\.[a-z]+$/",
            statusCode: 400,
            code: 'VAL_001'
          }),
          // Auth error with email and table name
          fc.constant({
            message: "User with email admin@company.com does not exist in table 'users'",
            statusCode: 401,
            code: 'AUTH_002'
          }),
          // Authz error with permission name and table
          fc.constant({
            message: "Permission 'contacts:delete' not found in role_permissions table for user_id 123",
            statusCode: 403,
            code: 'AUTHZ_001'
          })
        ),
        async (errorData) => {
          const error = new AppError(errorData.message, errorData.statusCode, errorData.code)
          const requestId = 'test-request-id'
          const sanitized = ErrorHandler.sanitizeError(error, requestId)
          
          // Should still be marked as the correct error type
          expect(sanitized.code).toBe(errorData.code)
          
          // Message should be sanitized
          const message = sanitized.message
          
          // Should not contain database table names
          expect(message).not.toMatch(/\b(users|role_permissions)\b/i)
          
          // Should not contain email addresses
          expect(message).not.toMatch(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)
          
          // Should not contain user IDs
          expect(message).not.toMatch(/user_id\s+\d+/i)
          
          // Should still be somewhat informative (not completely generic)
          expect(message.length).toBeGreaterThan(10)
        }
      ),
      { numRuns: 2 }
    )
  })


  /**
   * Property Test: Unknown/programming errors should return generic messages
   * 
   * Tests that unexpected errors (non-AppError instances) return completely generic
   * messages without any internal details:
   * - No stack traces
   * - No file paths
   * - No database details
   * - Generic "unexpected error" message
   * 
   * **Validates: Requirements 7.2, 7.5, 7.6, 7.7**
   */
  it('should return generic messages for unknown/programming errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Programming errors with sensitive details
          fc.constant("TypeError: Cannot read property 'id' of undefined at /app/lib/services/contact-service.ts:45:12"),
          fc.constant("ReferenceError: supabaseClient is not defined at ContactRepository.query (/app/lib/repositories/contact-repository.ts:89:10)"),
          fc.constant("Error: ENOENT: no such file or directory, open '/home/user/app/config/secrets.json'"),
          fc.constant("SyntaxError: Unexpected token } in JSON at position 123 in /app/lib/utils/parser.ts"),
          fc.constant("Error: connect ECONNREFUSED 127.0.0.1:5432 at TCPConnectWrap.afterConnect"),
          
          // Database errors
          fc.constant("PostgresError: relation 'public.users' does not exist"),
          fc.constant("Error: duplicate key value violates unique constraint 'users_email_key'"),
          
          // Generate random programming errors
          fc.record({
            errorType: fc.oneof(
              fc.constant("TypeError"),
              fc.constant("ReferenceError"),
              fc.constant("Error")
            ),
            detail: fc.oneof(
              fc.constant("Cannot read property 'id' of undefined"),
              fc.constant("variable is not defined"),
              fc.constant("ECONNREFUSED")
            ),
            path: fc.oneof(
              fc.constant("/app/lib/services/contact-service.ts:45:12"),
              fc.constant("/home/user/app/config/database.yml"),
              fc.constant("C:\\Users\\Admin\\app\\lib\\auth.ts:67:15")
            )
          }).map(({ errorType, detail, path }) => `${errorType}: ${detail} at ${path}`)
        ),
        async (programmingError) => {
          const error = new Error(programmingError)
          const requestId = 'test-request-id'
          const sanitized = ErrorHandler.sanitizeError(error, requestId)
          
          // Should return completely generic message
          expect(sanitized.message).toBe('An unexpected error occurred. Please try again later.')
          
          // Should have generic error name
          expect(sanitized.error).toBe('InternalServerError')
          
          // Should have generic error code
          expect(sanitized.code).toBe('INTERNAL_ERROR')
          
          // Should include request ID for tracing
          expect(sanitized.requestId).toBe(requestId)
          
          // Should have timestamp
          expect(sanitized.timestamp).toBeDefined()
          expect(new Date(sanitized.timestamp).getTime()).toBeGreaterThan(0)
        }
      ),
      { numRuns: 2 }
    )
  })

  /**
   * Property Test: Error responses should always include required fields
   * 
   * Tests that all error responses include the required fields:
   * - error: Error type name
   * - message: Sanitized error message
   * - code: Machine-readable error code
   * - requestId: Unique request identifier
   * - timestamp: ISO 8601 timestamp
   * 
   * **Validates: Requirements 7.8, 7.9**
   */
  it('should always include required fields in error responses', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Various error types
          fc.constant(new AppError('Validation failed', 400, 'VAL_001')),
          fc.constant(new Error('Unexpected error with database details: SELECT * FROM users')),
          fc.constant(new AppError('Authentication required', 401, 'AUTH_001')),
          fc.constant(new Error('File not found: /home/user/app/.env')),
          fc.constant(new AppError('Rate limit exceeded', 429, 'RATE_001'))
        ),
        async (error) => {
          const requestId = 'test-request-' + Math.random().toString(36).substring(7)
          const sanitized = ErrorHandler.sanitizeError(error, requestId)
          
          // All required fields should be present
          expect(sanitized).toHaveProperty('error')
          expect(sanitized).toHaveProperty('message')
          expect(sanitized).toHaveProperty('code')
          expect(sanitized).toHaveProperty('requestId')
          expect(sanitized).toHaveProperty('timestamp')
          
          // Fields should have correct types
          expect(typeof sanitized.error).toBe('string')
          expect(typeof sanitized.message).toBe('string')
          expect(typeof sanitized.code).toBe('string')
          expect(typeof sanitized.requestId).toBe('string')
          expect(typeof sanitized.timestamp).toBe('string')
          
          // Fields should not be empty
          expect(sanitized.error.length).toBeGreaterThan(0)
          expect(sanitized.message.length).toBeGreaterThan(0)
          expect(sanitized.code.length).toBeGreaterThan(0)
          expect(sanitized.requestId).toBe(requestId)
          
          // Timestamp should be valid ISO 8601
          expect(() => new Date(sanitized.timestamp)).not.toThrow()
          expect(new Date(sanitized.timestamp).toISOString()).toBe(sanitized.timestamp)
        }
      ),
      { numRuns: 2 }
    )
  })
})
