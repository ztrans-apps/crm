import { NextResponse } from 'next/server'

/**
 * Error response structure returned to clients
 * Provides consistent error format across all API endpoints
 */
export interface ErrorResponse {
  /** Error type/class name (e.g., "ValidationError", "AuthenticationError") */
  error: string
  
  /** Human-readable error message safe for client display */
  message: string
  
  /** Machine-readable error code for programmatic handling */
  code: string
  
  /** Unique request ID for tracing and debugging */
  requestId: string
  
  /** ISO 8601 timestamp when error occurred */
  timestamp: string
}

/**
 * Context information for error logging
 * Provides additional details for debugging and monitoring
 */
export interface ErrorContext {
  /** Unique request identifier */
  requestId: string
  
  /** User ID if authenticated */
  userId?: string
  
  /** Tenant ID if available */
  tenantId?: string
  
  /** Request path */
  path: string
  
  /** HTTP method */
  method: string
  
  /** Client IP address */
  ip?: string
  
  /** User agent string */
  userAgent?: string
}

/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  /**
   * Creates a new application error
   * @param message - Human-readable error message
   * @param statusCode - HTTP status code to return
   * @param code - Machine-readable error code
   * @param isOperational - Whether this is an expected operational error (true) or programming error (false)
   */
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
    public isOperational: boolean = true
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Validation error - thrown when input validation fails
 * HTTP Status: 400 Bad Request
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Invalid input provided', code: string = 'VAL_001') {
    super(message, 400, code, true)
  }
}

/**
 * Authentication error - thrown when authentication is required or fails
 * HTTP Status: 401 Unauthorized
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', code: string = 'AUTH_001') {
    super(message, 401, code, true)
  }
}

/**
 * Authorization error - thrown when user lacks required permissions
 * HTTP Status: 403 Forbidden
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', code: string = 'AUTHZ_001') {
    super(message, 403, code, true)
  }
}

/**
 * Rate limit error - thrown when rate limit is exceeded
 * HTTP Status: 429 Too Many Requests
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = 'Rate limit exceeded',
    code: string = 'RATE_001',
    public retryAfter?: number
  ) {
    super(message, 429, code, true)
  }
}

/**
 * Not found error - thrown when requested resource doesn't exist
 * HTTP Status: 404 Not Found
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', code: string = 'NOT_FOUND') {
    super(message, 404, code, true)
  }
}

/**
 * Conflict error - thrown when operation conflicts with current state
 * HTTP Status: 409 Conflict
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', code: string = 'CONFLICT') {
    super(message, 409, code, true)
  }
}

/**
 * Centralized error handler
 * Provides consistent error handling, sanitization, and logging
 */
export class ErrorHandler {
  /**
   * Handle an error and return appropriate HTTP response
   * @param error - The error to handle
   * @param requestId - Unique request identifier for tracing
   * @returns NextResponse with error details
   */
  static handle(error: Error, requestId: string): NextResponse {
    const sanitized = this.sanitizeError(error, requestId)
    
    // Determine status code
    const statusCode = error instanceof AppError ? error.statusCode : 500
    
    // Create response
    const response = NextResponse.json(sanitized, { status: statusCode })
    
    // Add Retry-After header for rate limit errors
    if (error instanceof RateLimitError && error.retryAfter) {
      response.headers.set('Retry-After', error.retryAfter.toString())
    }
    
    return response
  }
  
  /**
   * Sanitize error for client response
   * Removes sensitive information and provides safe error details
   * @param error - The error to sanitize
   * @param requestId - Unique request identifier
   * @returns Sanitized error response
   */
  static sanitizeError(error: Error, requestId: string): ErrorResponse {
    // For known operational errors, sanitize and return the message
    if (error instanceof AppError && error.isOperational) {
      // Additional sanitization: ensure message doesn't contain sensitive patterns
      const sanitizedMessage = this.sanitizeMessage(error.message)
      
      return {
        error: error.name,
        message: sanitizedMessage,
        code: error.code,
        requestId,
        timestamp: new Date().toISOString(),
      }
    }
    
    // For unknown/programming errors, return generic message
    // This prevents leaking internal details like database schema, file paths, etc.
    return {
      error: 'InternalServerError',
      message: 'An unexpected error occurred. Please try again later.',
      code: 'INTERNAL_ERROR',
      requestId,
      timestamp: new Date().toISOString(),
    }
  }
  
  /**
   * Sanitize error message to remove sensitive information
   * Ensures no database schema, file paths, or environment variables are exposed
   * @param message - The error message to sanitize
   * @returns Sanitized message
   */
  private static sanitizeMessage(message: string): string {
    // Check for database-related patterns first - these get a generic message
    const dbPatterns = [
      /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|TABLE|COLUMN|DATABASE|SCHEMA)\b/gi,
      /\b(pg_|postgres|supabase|relation|constraint|foreign key|primary key)\b/gi,
      /\b(duplicate key|violates|constraint|unique constraint)\b/gi,
    ]
    
    for (const pattern of dbPatterns) {
      if (pattern.test(message)) {
        // If database-related terms found, return generic message
        return 'A database error occurred. Please contact support.'
      }
    }
    
    // For non-database errors, sanitize specific patterns
    let sanitized = message
    
    // Remove file system paths (Unix and Windows)
    sanitized = sanitized.replace(/\/[\w\-./]+/g, '[path]')  // Unix paths
    sanitized = sanitized.replace(/[A-Z]:\\[\w\-\\]+/g, '[path]')  // Windows paths
    sanitized = sanitized.replace(/\.\.\/[\w\-./]+/g, '[path]')  // Relative paths
    
    // Remove environment variable references
    sanitized = sanitized.replace(/process\.env\.\w+/g, '[env]')
    sanitized = sanitized.replace(/\$\{?\w+\}?/g, '[env]')
    
    // Remove IP addresses (both IPv4 and IPv6)
    sanitized = sanitized.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[ip]')
    sanitized = sanitized.replace(/\b([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g, '[ip]')
    
    // Remove potential API keys or tokens (long alphanumeric strings)
    sanitized = sanitized.replace(/\b[a-zA-Z0-9_-]{32,}\b/g, '[token]')
    
    // Remove email addresses
    sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[email]')
    
    // Remove port numbers
    sanitized = sanitized.replace(/:\d{2,5}\b/g, ':[port]')
    
    return sanitized
  }
  
  /**
   * Log error with context for debugging and monitoring
   * @param error - The error to log
   * @param context - Additional context information
   */
  static logError(error: Error, context: ErrorContext): void {
    const logData = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error instanceof AppError ? error.code : undefined,
        statusCode: error instanceof AppError ? error.statusCode : 500,
        isOperational: error instanceof AppError ? error.isOperational : false,
      },
      context: {
        requestId: context.requestId,
        userId: context.userId,
        tenantId: context.tenantId,
        path: context.path,
        method: context.method,
        ip: context.ip,
        userAgent: context.userAgent,
      },
      timestamp: new Date().toISOString(),
    }
    
    // Log based on error severity
    if (error instanceof AppError && error.isOperational) {
      // Operational errors are expected - log as warning
      console.warn('Operational error:', JSON.stringify(logData, null, 2))
    } else {
      // Programming errors are unexpected - log as error
      console.error('Unexpected error:', JSON.stringify(logData, null, 2))
    }
    
    // Integrate with Sentry for error tracking
    this.sendToSentry(error, context)
  }
  
  /**
   * Send error to Sentry with sanitized context
   * @param error - The error to send
   * @param context - Additional context information
   */
  private static sendToSentry(error: Error, context: ErrorContext): void {
    // Only send to Sentry if DSN is configured
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
      return
    }
    
    // Dynamically import Sentry to avoid issues if not configured
    import('@/lib/monitoring/sentry').then(({ captureException }) => {
      // Prepare sanitized context for Sentry
      const sentryContext = {
        requestId: context.requestId,
        userId: context.userId,
        tenantId: context.tenantId,
        path: context.path,
        method: context.method,
        // Don't send full IP, just first two octets for privacy
        ipPrefix: context.ip ? context.ip.split('.').slice(0, 2).join('.') + '.x.x' : undefined,
        // Don't send full user agent, just browser info
        browser: context.userAgent ? this.extractBrowserInfo(context.userAgent) : undefined,
      }
      
      // Send to Sentry with appropriate severity level
      captureException(error, sentryContext)
    }).catch((err) => {
      // If Sentry import fails, just log it
      console.error('Failed to send error to Sentry:', err)
    })
  }
  
  /**
   * Extract browser information from user agent string
   * @param userAgent - User agent string
   * @returns Simplified browser info
   */
  private static extractBrowserInfo(userAgent: string): string {
    // Simple browser detection (not comprehensive, just for logging)
    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'
    return 'Other'
  }
}

/**
 * Error code constants for consistent error handling
 * Use these codes for programmatic error handling on the client side
 */
export const ERROR_CODES = {
  // Authentication errors (AUTH_xxx)
  AUTH_001: 'Authentication required',
  AUTH_002: 'Invalid credentials',
  AUTH_003: 'Session expired',
  
  // Authorization errors (AUTHZ_xxx)
  AUTHZ_001: 'Insufficient permissions',
  AUTHZ_002: 'Tenant access denied',
  
  // Validation errors (VAL_xxx)
  VAL_001: 'Invalid input',
  VAL_002: 'Missing required field',
  
  // Rate limiting errors (RATE_xxx)
  RATE_001: 'Rate limit exceeded',
  
  // Database errors (DB_xxx)
  DB_001: 'Database error',
  
  // External API errors (EXT_xxx)
  EXT_001: 'External API error',
} as const

/**
 * Type for error codes
 */
export type ErrorCode = keyof typeof ERROR_CODES
