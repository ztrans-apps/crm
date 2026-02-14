/**
 * API Key Service
 * Generate, validate, and manage API keys
 */

import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export interface ApiKey {
  id: string
  tenant_id: string
  name: string
  key_prefix: string
  scopes: string[]
  is_active: boolean
  last_used_at: string | null
  expires_at: string | null
  created_at: string
}

class ApiKeyService {
  /**
   * Generate a new API key
   */
  generateKey(): { key: string; hash: string; prefix: string } {
    // Generate random key: sk_live_32_random_chars
    const randomBytes = crypto.randomBytes(24)
    const key = `sk_live_${randomBytes.toString('base64url')}`
    
    // Hash the key for storage
    const hash = crypto.createHash('sha256').update(key).digest('hex')
    
    // Get prefix for identification
    const prefix = key.substring(0, 12) // sk_live_xxxx
    
    return { key, hash, prefix }
  }

  /**
   * Create API key
   */
  async createApiKey(
    tenantId: string,
    name: string,
    scopes: string[],
    expiresInDays?: number,
    createdBy?: string
  ): Promise<{ apiKey: ApiKey; key: string }> {
    try {
      const supabase = await createClient()
      
      // Generate key
      const { key, hash, prefix } = this.generateKey()
      
      // Calculate expiration
      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null
      
      // Insert into database
      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          tenant_id: tenantId,
          name,
          key_hash: hash,
          key_prefix: prefix,
          scopes,
          expires_at: expiresAt,
          created_by: createdBy,
        })
        .select()
        .single()
      
      if (error) throw error
      
      return {
        apiKey: data,
        key, // Return the actual key only once
      }
    } catch (error) {
      console.error('[ApiKeyService] Error creating API key:', error)
      throw error
    }
  }

  /**
   * Validate API key
   */
  async validateKey(key: string): Promise<ApiKey | null> {
    try {
      const supabase = await createClient()
      
      // Hash the provided key
      const hash = crypto.createHash('sha256').update(key).digest('hex')
      
      // Find key in database
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('key_hash', hash)
        .eq('is_active', true)
        .single()
      
      if (error || !data) {
        return null
      }
      
      // Check expiration
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        console.log('[ApiKeyService] API key expired:', data.key_prefix)
        return null
      }
      
      // Update last used timestamp
      await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', data.id)
      
      return data
    } catch (error) {
      console.error('[ApiKeyService] Error validating API key:', error)
      return null
    }
  }

  /**
   * Check if API key has required scope
   */
  hasScope(apiKey: ApiKey, requiredScope: string): boolean {
    // Check for wildcard scope
    if (apiKey.scopes.includes('*')) {
      return true
    }
    
    // Check for exact scope match
    if (apiKey.scopes.includes(requiredScope)) {
      return true
    }
    
    // Check for parent scope (e.g., messages:* includes messages:read)
    const [resource] = requiredScope.split(':')
    if (apiKey.scopes.includes(`${resource}:*`)) {
      return true
    }
    
    return false
  }

  /**
   * Log API key usage
   */
  async logUsage(
    apiKeyId: string,
    tenantId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTimeMs: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const supabase = await createClient()
      
      await supabase.from('api_key_usage').insert({
        api_key_id: apiKeyId,
        tenant_id: tenantId,
        endpoint,
        method,
        status_code: statusCode,
        response_time_ms: responseTimeMs,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
    } catch (error) {
      console.error('[ApiKeyService] Error logging usage:', error)
    }
  }

  /**
   * Get API key usage statistics
   */
  async getUsageStats(apiKeyId: string, days: number = 7): Promise<any> {
    try {
      const supabase = await createClient()
      
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      
      const { data, error } = await supabase
        .from('api_key_usage')
        .select('*')
        .eq('api_key_id', apiKeyId)
        .gte('created_at', startDate)
      
      if (error) throw error
      
      const total = data?.length || 0
      const successful = data?.filter(u => u.status_code >= 200 && u.status_code < 300).length || 0
      const failed = total - successful
      const avgResponseTime = total > 0
        ? Math.round(data!.reduce((sum, u) => sum + (u.response_time_ms || 0), 0) / total)
        : 0
      
      // Group by endpoint
      const byEndpoint: Record<string, number> = {}
      data?.forEach(u => {
        byEndpoint[u.endpoint] = (byEndpoint[u.endpoint] || 0) + 1
      })
      
      return {
        total,
        successful,
        failed,
        successRate: total > 0 ? ((successful / total) * 100).toFixed(2) + '%' : '0%',
        avgResponseTime,
        byEndpoint,
      }
    } catch (error) {
      console.error('[ApiKeyService] Error getting usage stats:', error)
      return null
    }
  }

  /**
   * List API keys for tenant
   */
  async listKeys(tenantId: string): Promise<ApiKey[]> {
    try {
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      return data || []
    } catch (error) {
      console.error('[ApiKeyService] Error listing API keys:', error)
      return []
    }
  }

  /**
   * Revoke API key
   */
  async revokeKey(apiKeyId: string): Promise<void> {
    try {
      const supabase = await createClient()
      
      await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('id', apiKeyId)
    } catch (error) {
      console.error('[ApiKeyService] Error revoking API key:', error)
      throw error
    }
  }

  /**
   * Delete API key
   */
  async deleteKey(apiKeyId: string): Promise<void> {
    try {
      const supabase = await createClient()
      
      await supabase
        .from('api_keys')
        .delete()
        .eq('id', apiKeyId)
    } catch (error) {
      console.error('[ApiKeyService] Error deleting API key:', error)
      throw error
    }
  }
}

// Singleton instance
export const apiKeyService = new ApiKeyService()

