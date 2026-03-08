import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Consent Manager
 * 
 * Implements GDPR Article 7 - Conditions for Consent
 * 
 * **Requirements: 38.3, 38.4**
 * 
 * Manages user consent for:
 * - Privacy policy acceptance
 * - Terms of service acceptance
 * - Marketing communications
 * - Analytics and tracking
 * - Data processing for specific purposes
 */

export type ConsentType =
  | 'privacy_policy'
  | 'terms_of_service'
  | 'marketing'
  | 'analytics'
  | 'data_processing'

export interface Consent {
  id: string
  user_id: string
  tenant_id: string
  consent_type: ConsentType
  purpose: string
  granted: boolean
  granted_at: string | null
  revoked_at: string | null
  version: string
  ip_address: string | null
  user_agent: string | null
  created_at: string
  updated_at: string
}

export interface GrantConsentInput {
  consent_type: ConsentType
  purpose: string
  version: string
  ip_address?: string
  user_agent?: string
}

export interface RevokeConsentInput {
  consent_type: ConsentType
}

export class ConsentManager {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * Grant consent for a specific purpose
   * 
   * @param userId - User ID granting consent
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @param input - Consent details
   * @returns Created consent record
   */
  async grantConsent(
    userId: string,
    tenantId: string,
    input: GrantConsentInput
  ): Promise<Consent> {
    const now = new Date().toISOString()

    // Check if consent already exists
    const { data: existing } = await this.supabase
      .from('user_consents')
      .select('*')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('consent_type', input.consent_type)
      .eq('version', input.version)
      .single()

    if (existing) {
      // Update existing consent
      const { data, error } = await this.supabase
        .from('user_consents')
        .update({
          granted: true,
          granted_at: now,
          revoked_at: null,
          ip_address: input.ip_address || null,
          user_agent: input.user_agent || null,
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update consent: ${error.message}`)
      }

      return data
    } else {
      // Create new consent
      const { data, error } = await this.supabase
        .from('user_consents')
        .insert({
          user_id: userId,
          tenant_id: tenantId,
          consent_type: input.consent_type,
          purpose: input.purpose,
          granted: true,
          granted_at: now,
          version: input.version,
          ip_address: input.ip_address || null,
          user_agent: input.user_agent || null,
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to grant consent: ${error.message}`)
      }

      return data
    }
  }

  /**
   * Revoke consent for a specific purpose
   * 
   * @param userId - User ID revoking consent
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @param input - Consent type to revoke
   * @returns Updated consent record
   */
  async revokeConsent(
    userId: string,
    tenantId: string,
    input: RevokeConsentInput
  ): Promise<Consent> {
    const now = new Date().toISOString()

    const { data, error } = await this.supabase
      .from('user_consents')
      .update({
        granted: false,
        revoked_at: now,
      })
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('consent_type', input.consent_type)
      .eq('granted', true)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to revoke consent: ${error.message}`)
    }

    return data
  }

  /**
   * Check if user has granted consent for a specific purpose
   * 
   * @param userId - User ID to check
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @param consentType - Type of consent to check
   * @param version - Optional version to check (defaults to any version)
   * @returns True if consent is granted, false otherwise
   */
  async hasConsent(
    userId: string,
    tenantId: string,
    consentType: ConsentType,
    version?: string
  ): Promise<boolean> {
    let query = this.supabase
      .from('user_consents')
      .select('granted')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('consent_type', consentType)
      .eq('granted', true)
      .is('revoked_at', null)

    if (version) {
      query = query.eq('version', version)
    }

    const { data, error } = await query.single()

    if (error || !data) {
      return false
    }

    return data.granted
  }

  /**
   * Get all consents for a user
   * 
   * @param userId - User ID to get consents for
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @returns Array of consent records
   */
  async getUserConsents(userId: string, tenantId: string): Promise<Consent[]> {
    const { data, error } = await this.supabase
      .from('user_consents')
      .select('*')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get user consents: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get consent history for a specific consent type
   * 
   * @param userId - User ID to get history for
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @param consentType - Type of consent to get history for
   * @returns Array of consent records (including revoked)
   */
  async getConsentHistory(
    userId: string,
    tenantId: string,
    consentType: ConsentType
  ): Promise<Consent[]> {
    const { data, error } = await this.supabase
      .from('user_consents')
      .select('*')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('consent_type', consentType)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get consent history: ${error.message}`)
    }

    return data || []
  }

  /**
   * Require consent for a specific purpose
   * 
   * Throws an error if consent is not granted.
   * 
   * @param userId - User ID to check
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @param consentType - Type of consent required
   * @param version - Optional version required
   * @throws Error if consent is not granted
   */
  async requireConsent(
    userId: string,
    tenantId: string,
    consentType: ConsentType,
    version?: string
  ): Promise<void> {
    const hasConsent = await this.hasConsent(userId, tenantId, consentType, version)

    if (!hasConsent) {
      throw new Error(
        `User has not granted consent for ${consentType}${version ? ` version ${version}` : ''}`
      )
    }
  }
}
