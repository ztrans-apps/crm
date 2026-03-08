// lib/security/session-config.ts

/**
 * Session Security Configuration
 * 
 * Implements secure session management with:
 * - HttpOnly and Secure cookie flags
 * - Inactivity and absolute timeouts
 * - Concurrent session limits
 * - Session regeneration on authentication
 * 
 * Requirements: 29.2, 29.3, 29.4, 29.5, 29.6, 29.9
 */

export const SESSION_SECURITY_CONFIG = {
  /**
   * Cookie configuration
   */
  cookie: {
    name: 'session_id',
    httpOnly: true, // Prevents JavaScript access (XSS protection)
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax' as const, // CSRF protection
    path: '/',
    maxAge: 24 * 60 * 60, // 24 hours in seconds
  },

  /**
   * Timeout configuration
   */
  timeouts: {
    inactivity: 30 * 60 * 1000, // 30 minutes in milliseconds
    absolute: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  },

  /**
   * Concurrent session limits
   */
  limits: {
    maxConcurrentSessions: 5, // Maximum sessions per user
  },

  /**
   * Session regeneration
   * Regenerate session ID after authentication to prevent session fixation attacks
   */
  regeneration: {
    onAuthentication: true,
    onPrivilegeElevation: true,
  },
}

/**
 * Get cookie options for session cookie
 * 
 * @param maxAge - Optional max age override in seconds
 * @returns Cookie options object
 */
export function getSessionCookieOptions(maxAge?: number) {
  return {
    httpOnly: SESSION_SECURITY_CONFIG.cookie.httpOnly,
    secure: SESSION_SECURITY_CONFIG.cookie.secure,
    sameSite: SESSION_SECURITY_CONFIG.cookie.sameSite,
    path: SESSION_SECURITY_CONFIG.cookie.path,
    maxAge: maxAge || SESSION_SECURITY_CONFIG.cookie.maxAge,
  }
}

/**
 * Get cookie options for clearing session cookie
 */
export function getClearSessionCookieOptions() {
  return {
    httpOnly: SESSION_SECURITY_CONFIG.cookie.httpOnly,
    secure: SESSION_SECURITY_CONFIG.cookie.secure,
    sameSite: SESSION_SECURITY_CONFIG.cookie.sameSite,
    path: SESSION_SECURITY_CONFIG.cookie.path,
    maxAge: 0, // Expire immediately
  }
}
