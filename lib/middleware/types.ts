import { SupabaseClient } from '@supabase/supabase-js'
import { ZodSchema } from 'zod'

/**
 * Configuration options for the withAuth middleware
 * Supports authentication, authorization, rate limiting, and input validation
 */
export interface WithAuthOptions {
  /** Single permission required (uses OR logic with anyPermission) */
  permission?: string
  
  /** Array of permissions where user needs at least one (OR logic) */
  anyPermission?: string[]
  
  /** Array of permissions where user needs all of them (AND logic) */
  allPermissions?: string[]
  
  /** Array of roles required for access */
  roles?: string[]
  
  /** Skip tenant isolation check (for system-wide operations) */
  skipTenant?: boolean
  
  /** Rate limiting configuration for this endpoint */
  rateLimit?: RateLimitConfig
  
  /** Input validation schemas for request data */
  validation?: {
    /** Zod schema for request body validation */
    body?: ZodSchema
    
    /** Zod schema for query parameters validation */
    query?: ZodSchema
    
    /** Zod schema for path parameters validation */
    params?: ZodSchema
  }
}

/**
 * Rate limiting configuration
 * Used to control request frequency per tenant/user/IP
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed in the time window */
  maxRequests: number
  
  /** Time window in seconds for rate limiting */
  windowSeconds: number
  
  /** Optional prefix for the rate limit key (defaults to endpoint path) */
  keyPrefix?: string
}

/**
 * Authentication context injected into API route handlers
 * Contains authenticated user data, tenant info, and validated inputs
 */
export interface AuthContext {
  /** Authenticated user information */
  user: {
    id: string
    email?: string
  }
  
  /** User profile with tenant association */
  profile: {
    id: string
    tenant_id: string
    role?: string
  }
  
  /** Tenant ID for multi-tenant isolation */
  tenantId: string
  
  /** Supabase client with user context (respects RLS) */
  supabase: SupabaseClient
  
  /** Supabase service client with elevated privileges (bypasses RLS) */
  serviceClient: SupabaseClient
  
  /** Validated request body (if validation schema provided) */
  validatedBody?: any
  
  /** Validated query parameters (if validation schema provided) */
  validatedQuery?: any
  
  /** Validated path parameters (if validation schema provided) */
  validatedParams?: any
}

/**
 * Result of input validation
 * Generic type T represents the validated data type
 */
export interface ValidationResult<T = any> {
  /** Whether validation succeeded */
  success: boolean
  
  /** Validated and typed data (only present if success is true) */
  data?: T
  
  /** Array of validation errors (only present if success is false) */
  errors?: ValidationError[]
}

/**
 * Individual validation error
 * Provides details about what field failed and why
 */
export interface ValidationError {
  /** Field path that failed validation (e.g., "email", "user.name") */
  field: string
  
  /** Human-readable error message */
  message: string
  
  /** Error code for programmatic handling */
  code: string
}
