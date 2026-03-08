import { createLogger } from '@/lib/monitoring/logger'

const logger = createLogger('request-logger')

/**
 * Structured log entry for API requests
 * Contains all relevant request/response information for audit and debugging
 */
export interface RequestLog {
  /** Unique identifier for request tracing */
  requestId: string
  
  /** ISO 8601 timestamp of the request */
  timestamp: string
  
  /** HTTP method (GET, POST, PUT, DELETE, etc.) */
  method: string
  
  /** Request path/endpoint */
  path: string
  
  /** Query parameters (sanitized) */
  query: Record<string, string>
  
  /** Authenticated user ID (if available) */
  userId?: string
  
  /** Tenant ID for multi-tenant isolation (if available) */
  tenantId?: string
  
  /** Client IP address */
  ip: string
  
  /** User agent string */
  userAgent: string
  
  /** HTTP response status code */
  statusCode: number
  
  /** Request duration in milliseconds */
  duration: number
  
  /** Error message (if request failed) */
  error?: string
}

/**
 * Security event types for audit logging
 */
export type SecurityEventType = 
  | 'auth_failure'      // Failed authentication attempt
  | 'authz_failure'     // Failed authorization check
  | 'rate_limit'        // Rate limit exceeded
  | 'suspicious_activity' // Unusual or potentially malicious activity
  | 'api_key_usage'     // API key usage tracking

/**
 * Security event log entry
 * Used for tracking security-relevant events for incident response
 */
export interface SecurityEvent {
  /** Type of security event */
  type: SecurityEventType
  
  /** User ID involved (if known) */
  userId?: string
  
  /** Tenant ID involved (if known) */
  tenantId?: string
  
  /** Client IP address */
  ip: string
  
  /** Additional event-specific details */
  details: Record<string, unknown>
  
  /** ISO 8601 timestamp of the event */
  timestamp: string
}

/**
 * Sensitive field patterns to exclude from logs
 * These patterns match field names that commonly contain sensitive data
 */
const SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /api[_-]?key/i,
  /auth/i,
  /credential/i,
  /private[_-]?key/i,
  /access[_-]?key/i,
  /session/i,
  /cookie/i,
  /authorization/i,
  /bearer/i,
  /jwt/i,
  /ssn/i,
  /social[_-]?security/i,
  /credit[_-]?card/i,
  /card[_-]?number/i,
  /cvv/i,
  /pin/i,
]

/**
 * Request Logger
 * Provides centralized logging for API requests and security events
 * Automatically sanitizes sensitive data to prevent exposure
 */
export class RequestLogger {
  /**
   * Log an API request with full context
   * Automatically sanitizes sensitive data before logging
   * 
   * @param log - Request log entry
   */
  static logRequest(log: RequestLog): void {
    // Sanitize query parameters to remove sensitive data
    const sanitizedQuery = this.sanitizeObject(log.query)
    
    // Sanitize error message if present
    const sanitizedError = log.error ? this.sanitizeString(log.error) : undefined
    
    // Create sanitized log entry
    const sanitizedLog = {
      ...log,
      query: sanitizedQuery,
      error: sanitizedError,
    }
    
    // Log at appropriate level based on status code
    if (log.statusCode >= 500) {
      logger.error(sanitizedLog, 'API request failed with server error')
    } else if (log.statusCode >= 400) {
      logger.warn(sanitizedLog, 'API request failed with client error')
    } else {
      logger.info(sanitizedLog, 'API request completed')
    }
  }
  
  /**
   * Log a security event for audit and incident response
   * 
   * @param event - Security event details
   */
  static logSecurityEvent(event: SecurityEvent): void {
    // Sanitize event details
    const sanitizedDetails = this.sanitizeObject(event.details)
    
    const sanitizedEvent = {
      ...event,
      details: sanitizedDetails,
    }
    
    // Log security events at warn level for visibility
    logger.warn(sanitizedEvent, `Security event: ${event.type}`)
  }
  
  /**
   * Sanitize an object by removing sensitive fields
   * Recursively processes nested objects and arrays
   * 
   * @param obj - Object to sanitize
   * @returns Sanitized object with sensitive fields redacted
   */
  private static sanitizeObject(obj: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(obj)) {
      // Check if field name matches sensitive patterns
      if (this.isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]'
        continue
      }
      
      // Recursively sanitize nested objects
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeObject(value)
      }
      // Sanitize arrays
      else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'object' && item !== null
            ? this.sanitizeObject(item)
            : item
        )
      }
      // Keep primitive values as-is
      else {
        sanitized[key] = value
      }
    }
    
    return sanitized
  }
  
  /**
   * Sanitize a string by removing potential sensitive data patterns
   * 
   * @param str - String to sanitize
   * @returns Sanitized string
   */
  private static sanitizeString(str: string): string {
    let sanitized = str
    
    // Remove potential JWT tokens FIRST (before generic token pattern)
    sanitized = sanitized.replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[JWT_REDACTED]')
    
    // Remove potential API keys
    sanitized = sanitized.replace(/\b(sk|pk|api)_[A-Za-z0-9_-]+/gi, '[API_KEY_REDACTED]')
    
    // Remove potential tokens (long alphanumeric strings) - but not parts of already redacted items
    sanitized = sanitized.replace(/\b[A-Za-z0-9_-]{32,}\b/g, '[TOKEN_REDACTED]')
    
    // Remove potential passwords in error messages
    sanitized = sanitized.replace(/password[=:]\s*['"]?[^'"\s]+['"]?/gi, 'password=[REDACTED]')
    
    return sanitized
  }
  
  /**
   * Check if a field name matches sensitive data patterns
   * 
   * @param fieldName - Field name to check
   * @returns True if field is sensitive
   */
  private static isSensitiveField(fieldName: string): boolean {
    return SENSITIVE_FIELD_PATTERNS.some(pattern => pattern.test(fieldName))
  }
  
  /**
   * Create a request log entry from HTTP request/response
   * Helper method for middleware integration
   * 
   * @param params - Request/response parameters
   * @returns RequestLog entry ready for logging
   */
  static createRequestLog(params: {
    requestId: string
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
  }): RequestLog {
    return {
      requestId: params.requestId,
      timestamp: new Date().toISOString(),
      method: params.method,
      path: params.path,
      query: params.query,
      userId: params.userId,
      tenantId: params.tenantId,
      ip: params.ip,
      userAgent: params.userAgent,
      statusCode: params.statusCode,
      duration: params.duration,
      error: params.error,
    }
  }
  
  /**
   * Create a security event entry
   * Helper method for security event logging
   * 
   * @param params - Security event parameters
   * @returns SecurityEvent entry ready for logging
   */
  static createSecurityEvent(params: {
    type: SecurityEventType
    userId?: string
    tenantId?: string
    ip: string
    details: Record<string, unknown>
  }): SecurityEvent {
    return {
      type: params.type,
      userId: params.userId,
      tenantId: params.tenantId,
      ip: params.ip,
      details: params.details,
      timestamp: new Date().toISOString(),
    }
  }
}
