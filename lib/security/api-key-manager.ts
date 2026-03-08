import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'

export interface APIKey {
  id: string
  tenant_id: string
  name: string
  key_prefix: string
  key_hash: string
  scopes: string[]
  ip_whitelist: string[]
  expires_at: string | null
  last_used_at: string | null
  created_at: string
  revoked_at: string | null
}

export interface CreateAPIKeyOptions {
  tenantId: string
  name: string
  scopes: string[]
  ipWhitelist?: string[]
  expiresAt?: Date
}

export interface ValidateAPIKeyResult {
  valid: boolean
  keyData?: APIKey
  reason?: string
}

export class APIKeyManager {
  private supabase

  constructor(supabaseClient?: any) {
    // Use service role client for API key operations
    this.supabase = supabaseClient || createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }

  /**
   * Generate a cryptographically secure API key
   * Format: sk_live_<32 random bytes in base64url> or sk_test_<32 random bytes>
   */
  private generateAPIKey(environment: 'live' | 'test' = 'live'): string {
    const randomPart = randomBytes(32).toString('base64url')
    return `sk_${environment}_${randomPart}`
  }

  /**
   * Extract the prefix from an API key (first 12 characters)
   */
  private extractPrefix(key: string): string {
    return key.substring(0, 12)
  }

  /**
   * Hash an API key using bcrypt
   */
  private async hashKey(key: string): Promise<string> {
    const saltRounds = 10
    return bcrypt.hash(key, saltRounds)
  }

  /**
   * Verify an API key against its hash
   */
  private async verifyKey(key: string, hash: string): Promise<boolean> {
    return bcrypt.compare(key, hash)
  }

  /**
   * Create a new API key
   * Returns the full key (only shown once) and the key data
   */
  async createAPIKey(
    options: CreateAPIKeyOptions
  ): Promise<{ key: string; keyData: APIKey }> {
    const { tenantId, name, scopes, ipWhitelist = [], expiresAt } = options

    // Generate the API key
    const key = this.generateAPIKey('live')
    const keyPrefix = this.extractPrefix(key)
    const keyHash = await this.hashKey(key)

    // Insert into database
    const { data, error } = await this.supabase
      .from('api_keys')
      .insert({
        tenant_id: tenantId,
        name,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        scopes,
        ip_whitelist: ipWhitelist,
        expires_at: expiresAt?.toISOString() || null,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create API key: ${error.message}`)
    }

    return {
      key, // Full key - only returned once
      keyData: data as APIKey,
    }
  }

  /**
   * Validate an API key
   * Returns validation result with key data if valid
   */
  async validateAPIKey(key: string): Promise<ValidateAPIKeyResult> {
    // Extract prefix to find the key
    const keyPrefix = this.extractPrefix(key)

    // Find the key by prefix
    const { data: keys, error } = await this.supabase
      .from('api_keys')
      .select('*')
      .eq('key_prefix', keyPrefix)
      .is('revoked_at', null)

    if (error) {
      return { valid: false, reason: 'Database error' }
    }

    if (!keys || keys.length === 0) {
      return { valid: false, reason: 'API key not found' }
    }

    // Check each key with matching prefix (should be unique, but verify hash)
    for (const keyData of keys) {
      const isValid = await this.verifyKey(key, keyData.key_hash)
      
      if (isValid) {
        // Check if expired
        if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
          return { valid: false, reason: 'API key expired' }
        }

        // Update last used timestamp
        await this.updateLastUsed(keyData.id)

        return {
          valid: true,
          keyData: keyData as APIKey,
        }
      }
    }

    return { valid: false, reason: 'Invalid API key' }
  }

  /**
   * Revoke an API key
   */
  async revokeAPIKey(keyId: string): Promise<void> {
    const { error } = await this.supabase
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', keyId)

    if (error) {
      throw new Error(`Failed to revoke API key: ${error.message}`)
    }
  }

  /**
   * Rotate an API key (revoke old, create new with same settings)
   */
  async rotateAPIKey(
    keyId: string
  ): Promise<{ key: string; keyData: APIKey }> {
    // Get the old key data
    const { data: oldKey, error: fetchError } = await this.supabase
      .from('api_keys')
      .select('*')
      .eq('id', keyId)
      .single()

    if (fetchError || !oldKey) {
      throw new Error('API key not found')
    }

    // Revoke the old key
    await this.revokeAPIKey(keyId)

    // Create a new key with the same settings
    return this.createAPIKey({
      tenantId: oldKey.tenant_id,
      name: oldKey.name,
      scopes: oldKey.scopes,
      ipWhitelist: oldKey.ip_whitelist,
      expiresAt: oldKey.expires_at ? new Date(oldKey.expires_at) : undefined,
    })
  }

  /**
   * List all API keys for a tenant (excluding revoked keys by default)
   */
  async listAPIKeys(
    tenantId: string,
    includeRevoked: boolean = false
  ): Promise<APIKey[]> {
    let query = this.supabase
      .from('api_keys')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (!includeRevoked) {
      query = query.is('revoked_at', null)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to list API keys: ${error.message}`)
    }

    return (data as APIKey[]) || []
  }

  /**
   * Update the last used timestamp for an API key
   */
  async updateLastUsed(keyId: string): Promise<void> {
    // Fire and forget - don't wait for response
    this.supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyId)
      .then(() => {})
      .catch(() => {})
  }

  /**
   * Check if an IP address is in the whitelist
   */
  isIPWhitelisted(ip: string, whitelist: string[]): boolean {
    if (!whitelist || whitelist.length === 0) {
      return true // No whitelist means all IPs allowed
    }

    // Simple IP matching (exact match)
    // In production, you'd want to support CIDR ranges
    return whitelist.includes(ip)
  }

  /**
   * Check if a scope is granted to an API key
   */
  hasScope(keyData: APIKey, requiredScope: string): boolean {
    return keyData.scopes.includes(requiredScope) || keyData.scopes.includes('*')
  }
}
