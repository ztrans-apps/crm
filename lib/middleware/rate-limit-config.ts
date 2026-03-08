/**
 * Rate Limit Configuration
 * 
 * Defines rate limit tiers for different endpoint categories.
 * These configurations are used by the RateLimiter middleware to enforce
 * request limits per tenant, user, or IP address.
 * 
 * Requirements: 3.6, 3.7, 3.8, 3.9
 */

import { RateLimitOptions } from './rate-limiter'

/**
 * Rate limit tier configuration
 */
export interface RateLimitTier {
  /** Maximum number of requests allowed */
  maxRequests: number
  
  /** Time window in seconds */
  windowSeconds: number
  
  /** Description of this tier */
  description: string
  
  /** Identifier type: 'ip', 'tenant', or 'user' */
  identifierType: 'ip' | 'tenant' | 'user'
}

/**
 * Rate limit tiers for different endpoint categories
 * 
 * Requirement 3.6: Authentication endpoints - 5 requests/minute per IP
 * Requirement 3.7: WhatsApp message sending - 100 requests/hour per tenant
 * Requirement 3.8: Standard API endpoints - 1000 requests/hour per tenant
 * Requirement 3.9: Admin endpoints - 500 requests/hour per user
 */
export const RATE_LIMIT_TIERS = {
  /**
   * Authentication endpoints (login, register, password reset)
   * 
   * Strict limit to prevent brute force attacks
   * Requirement 3.6: 5 requests/minute per IP
   */
  AUTHENTICATION: {
    maxRequests: 5,
    windowSeconds: 60, // 1 minute
    description: 'Authentication endpoints (login, register, password reset)',
    identifierType: 'ip' as const,
  },
  
  /**
   * WhatsApp message sending endpoints
   * 
   * Moderate limit to prevent spam and respect WhatsApp API limits
   * Requirement 3.7: 100 requests/hour per tenant
   */
  WHATSAPP_MESSAGING: {
    maxRequests: 100,
    windowSeconds: 3600, // 1 hour
    description: 'WhatsApp message sending endpoints',
    identifierType: 'tenant' as const,
  },
  
  /**
   * Standard API endpoints (contacts, conversations, etc.)
   * 
   * Generous limit for normal operations
   * Requirement 3.8: 1000 requests/hour per tenant
   */
  STANDARD_API: {
    maxRequests: 1000,
    windowSeconds: 3600, // 1 hour
    description: 'Standard API endpoints',
    identifierType: 'tenant' as const,
  },
  
  /**
   * Admin endpoints (user management, tenant configuration)
   * 
   * Moderate limit for administrative operations
   * Requirement 3.9: 500 requests/hour per user
   */
  ADMIN: {
    maxRequests: 500,
    windowSeconds: 3600, // 1 hour
    description: 'Admin endpoints',
    identifierType: 'user' as const,
  },
  
  /**
   * Webhook endpoints
   * 
   * High limit for external integrations
   */
  WEBHOOK: {
    maxRequests: 10000,
    windowSeconds: 3600, // 1 hour
    description: 'Webhook endpoints',
    identifierType: 'tenant' as const,
  },
} as const

/**
 * Endpoint category type
 */
export type RateLimitCategory = keyof typeof RATE_LIMIT_TIERS

/**
 * Get rate limit options for a specific category and identifier
 * 
 * @param category - The rate limit category (AUTHENTICATION, WHATSAPP_MESSAGING, etc.)
 * @param identifier - The identifier (IP address, tenant ID, or user ID)
 * @param keyPrefix - Optional custom key prefix (defaults to category name)
 * @returns Rate limit options ready to use with RateLimiter
 * 
 * @example
 * ```typescript
 * // For authentication endpoint
 * const options = getRateLimitOptions('AUTHENTICATION', ipAddress)
 * const result = await rateLimiter.checkLimit(options)
 * 
 * // For message sending
 * const options = getRateLimitOptions('WHATSAPP_MESSAGING', tenantId)
 * const result = await rateLimiter.checkLimit(options)
 * ```
 */
export function getRateLimitOptions(
  category: RateLimitCategory,
  identifier: string,
  keyPrefix?: string
): Omit<RateLimitOptions, 'identifier'> & { identifier: string } {
  const tier = RATE_LIMIT_TIERS[category]
  
  return {
    maxRequests: tier.maxRequests,
    windowSeconds: tier.windowSeconds,
    keyPrefix: keyPrefix || category.toLowerCase(),
    identifier,
  }
}

/**
 * Helper function to get rate limit options for authentication endpoints
 * 
 * @param ipAddress - The client IP address
 * @returns Rate limit options for authentication
 */
export function getAuthRateLimitOptions(ipAddress: string): RateLimitOptions {
  return getRateLimitOptions('AUTHENTICATION', ipAddress, 'auth')
}

/**
 * Helper function to get rate limit options for WhatsApp messaging
 * 
 * @param tenantId - The tenant ID
 * @returns Rate limit options for WhatsApp messaging
 */
export function getWhatsAppRateLimitOptions(tenantId: string): RateLimitOptions {
  return getRateLimitOptions('WHATSAPP_MESSAGING', tenantId, 'whatsapp')
}

/**
 * Helper function to get rate limit options for standard API endpoints
 * 
 * @param tenantId - The tenant ID
 * @returns Rate limit options for standard API
 */
export function getStandardApiRateLimitOptions(tenantId: string): RateLimitOptions {
  return getRateLimitOptions('STANDARD_API', tenantId, 'api')
}

/**
 * Helper function to get rate limit options for admin endpoints
 * 
 * @param userId - The user ID
 * @returns Rate limit options for admin endpoints
 */
export function getAdminRateLimitOptions(userId: string): RateLimitOptions {
  return getRateLimitOptions('ADMIN', userId, 'admin')
}

/**
 * Helper function to get rate limit options for webhook endpoints
 * 
 * @param tenantId - The tenant ID
 * @returns Rate limit options for webhook endpoints
 */
export function getWebhookRateLimitOptions(tenantId: string): RateLimitOptions {
  return getRateLimitOptions('WEBHOOK', tenantId, 'webhook')
}
