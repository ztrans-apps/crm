// Base service class with common functionality
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

export abstract class BaseService {
  protected supabase: SupabaseClient
  protected defaultTenantId: string

  constructor() {
    this.supabase = createClient()
    this.defaultTenantId = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'
  }

  /**
   * Get default headers with tenant ID
   */
  protected getDefaultHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-Tenant-ID': this.defaultTenantId
    }
  }

  /**
   * Handle service errors consistently
   */
  protected handleError(error: any, context: string): never {
    console.error(`[${context}] Error:`, error)
    throw new Error(error.message || `Error in ${context}`)
  }

  /**
   * Log service actions for debugging
   */
  protected log(context: string, message: string, data?: any) {
    // Disabled for cleaner console
    // if (process.env.NODE_ENV === 'development') {
    //   console.log(`[${context}] ${message}`, data || '')
    // }
  }
}
