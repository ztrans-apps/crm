import { NextResponse } from 'next/server'

/**
 * Security headers configuration
 * These headers protect against common web vulnerabilities
 * 
 * References:
 * - Requirements 13.1-13.10 from security-optimization spec
 * - OWASP Secure Headers Project
 */
const SECURITY_HEADERS = {
  /**
   * X-Content-Type-Options: nosniff
   * Prevents MIME type sniffing attacks
   * Requirement 13.1
   */
  'X-Content-Type-Options': 'nosniff',
  
  /**
   * X-Frame-Options: DENY
   * Prevents clickjacking attacks by disallowing iframe embedding
   * Requirement 13.2
   */
  'X-Frame-Options': 'DENY',
  
  /**
   * X-XSS-Protection: 1; mode=block
   * Enables browser XSS filtering and blocks page if attack detected
   * Requirement 13.3
   */
  'X-XSS-Protection': '1; mode=block',
  
  /**
   * Strict-Transport-Security
   * Forces HTTPS connections for 1 year including subdomains
   * Requirement 13.4
   */
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  
  /**
   * Content-Security-Policy
   * Controls which resources can be loaded and executed
   * Requirement 13.5
   * 
   * Policy breakdown:
   * - default-src 'self': Only load resources from same origin by default
   * - script-src 'self' 'unsafe-inline' 'unsafe-eval': Allow scripts from same origin, inline scripts, and eval
   *   (Note: 'unsafe-inline' and 'unsafe-eval' are needed for Next.js but should be tightened in production)
   * - style-src 'self' 'unsafe-inline': Allow styles from same origin and inline styles
   */
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
  
  /**
   * Referrer-Policy: strict-origin-when-cross-origin
   * Controls how much referrer information is sent with requests
   * Requirement 13.6
   * 
   * Behavior:
   * - Same origin: Send full URL
   * - Cross origin (HTTPS to HTTPS): Send origin only
   * - Cross origin (HTTPS to HTTP): Send nothing
   */
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  /**
   * Permissions-Policy
   * Restricts access to browser features and APIs
   * Requirement 13.7
   * 
   * Disabled features:
   * - geolocation: Location tracking
   * - microphone: Audio recording
   * - camera: Video recording
   */
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
} as const

/**
 * Add security headers to a NextResponse
 * 
 * This function applies all security headers defined in SECURITY_HEADERS
 * and removes the X-Powered-By header to prevent server fingerprinting.
 * 
 * @param response - The NextResponse object to add headers to
 * @returns The same NextResponse object with security headers added
 * 
 * @example
 * ```typescript
 * // In an API route
 * const response = NextResponse.json({ data: 'example' })
 * return addSecurityHeaders(response)
 * ```
 * 
 * @example
 * ```typescript
 * // In middleware
 * const response = NextResponse.next()
 * return addSecurityHeaders(response)
 * ```
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Apply all security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  /**
   * Remove X-Powered-By header
   * Requirement 13.8
   * 
   * This header reveals server technology (e.g., "Next.js")
   * Removing it reduces information available to attackers
   */
  response.headers.delete('X-Powered-By')
  
  return response
}

/**
 * Export security headers configuration for testing and documentation
 */
export { SECURITY_HEADERS }
