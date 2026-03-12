import { getRedisClient } from '@/lib/cache/redis'
import { createClient } from '@/lib/supabase/server'

/**
 * Threat event types
 */
export interface ThreatEvent {
  type: 'brute_force' | 'credential_stuffing' | 'suspicious_pattern' | 'privilege_escalation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  userId?: string
  tenantId?: string
  ip: string
  details: Record<string, unknown>
  timestamp: string
}

/**
 * Block rule for entities
 */
export interface BlockRule {
  type: 'ip' | 'user' | 'tenant'
  identifier: string
  reason: string
  expiresAt: string
}

/**
 * In-memory fallback for tracking failed attempts when Redis is unavailable
 */
class InMemoryTracker {
  private attempts: Map<string, number[]> = new Map()
  
  addAttempt(key: string): void {
    const now = Date.now()
    const attempts = this.attempts.get(key) || []
    attempts.push(now)
    this.attempts.set(key, attempts)
  }
  
  getAttempts(key: string, windowMs: number): number {
    const now = Date.now()
    const attempts = this.attempts.get(key) || []
    const recentAttempts = attempts.filter(ts => ts > now - windowMs)
    this.attempts.set(key, recentAttempts)
    return recentAttempts.length
  }
  
  clear(key: string): void {
    this.attempts.delete(key)
  }
  
  cleanup(): void {
    const now = Date.now()
    const maxAge = 3600 * 1000 // 1 hour
    
    for (const [key, attempts] of this.attempts.entries()) {
      const filtered = attempts.filter(ts => ts > now - maxAge)
      if (filtered.length === 0) {
        this.attempts.delete(key)
      } else {
        this.attempts.set(key, filtered)
      }
    }
  }
}

const inMemoryTracker = new InMemoryTracker()

// Cleanup in-memory tracker every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    inMemoryTracker.cleanup()
  }, 5 * 60 * 1000)
}

/**
 * Intrusion Detection System
 * 
 * Detects and prevents security threats including:
 * - Brute force attacks
 * - Credential stuffing
 * - Suspicious patterns
 * - Privilege escalation attempts
 * 
 * Uses Redis for distributed tracking with in-memory fallback.
 * Automatically blocks IPs and users based on configurable rules.
 * 
 * @example
 * ```typescript
 * const ids = new IntrusionDetectionSystem()
 * 
 * // Check for brute force attack
 * const isBruteForce = await ids.detectBruteForce(ipAddress, userId)
 * if (isBruteForce) {
 *   await ids.blockIP(ipAddress, 15 * 60, 'Brute force detected')
 * }
 * 
 * // Check if IP is blocked
 * const blocked = await ids.isBlocked('ip', ipAddress)
 * if (blocked) {
 *   return res.status(403).json({ error: 'Access denied' })
 * }
 * ```
 */
export class IntrusionDetectionSystem {
  private redis: ReturnType<typeof getRedisClient>
  private supabaseClient: any
  
  constructor(supabaseClient?: any) {
    this.redis = getRedisClient()
    this.supabaseClient = supabaseClient
  }
  
  private async getSupabase() {
    if (this.supabaseClient) {
      return this.supabaseClient
    }
    return await createClient()
  }
  
  /**
   * Detect brute force attack
   * 
   * Rule: 5 failed login attempts in 5 minutes → 15 minute IP block
   * 
   * @param ip - IP address to check
   * @param userId - Optional user ID for user-specific tracking
   * @returns True if brute force detected
   */
  async detectBruteForce(ip: string, userId?: string): Promise<boolean> {
    const key = userId ? `bruteforce:user:${userId}` : `bruteforce:ip:${ip}`
    const windowSeconds = 5 * 60 // 5 minutes
    const threshold = 5
    
    try {
      if (!this.redis) {
        // Fallback to in-memory tracking
        inMemoryTracker.addAttempt(key)
        const count = inMemoryTracker.getAttempts(key, windowSeconds * 1000)
        return count >= threshold
      }
      
      const now = Date.now()
      const windowStart = now - (windowSeconds * 1000)
      
      // Add current attempt
      const uniqueId = `${now}-${Math.random().toString(36).substr(2, 9)}`
      await this.redis.zadd(key, { score: now, member: uniqueId })
      
      // Remove old attempts
      await this.redis.zremrangebyscore(key, 0, windowStart)
      
      // Count attempts in window
      const count = await this.redis.zcard(key)
      
      // Set expiration
      await this.redis.expire(key, windowSeconds + 60)
      
      return count >= threshold
    } catch (error) {
      console.error('Brute force detection error:', error)
      // Fallback to in-memory
      inMemoryTracker.addAttempt(key)
      const count = inMemoryTracker.getAttempts(key, windowSeconds * 1000)
      return count >= threshold
    }
  }
  
  /**
   * Detect credential stuffing attack
   * 
   * Rule: 20 failed logins from same IP in 1 hour → 1 hour IP block
   * 
   * @param ip - IP address to check
   * @returns True if credential stuffing detected
   */
  async detectCredentialStuffing(ip: string): Promise<boolean> {
    const key = `credstuff:ip:${ip}`
    const windowSeconds = 60 * 60 // 1 hour
    const threshold = 20
    
    try {
      if (!this.redis) {
        // Fallback to in-memory tracking
        inMemoryTracker.addAttempt(key)
        const count = inMemoryTracker.getAttempts(key, windowSeconds * 1000)
        return count >= threshold
      }
      
      const now = Date.now()
      const windowStart = now - (windowSeconds * 1000)
      
      // Add current attempt
      const uniqueId = `${now}-${Math.random().toString(36).substr(2, 9)}`
      await this.redis.zadd(key, { score: now, member: uniqueId })
      
      // Remove old attempts
      await this.redis.zremrangebyscore(key, 0, windowStart)
      
      // Count attempts in window
      const count = await this.redis.zcard(key)
      
      // Set expiration
      await this.redis.expire(key, windowSeconds + 60)
      
      return count >= threshold
    } catch (error) {
      console.error('Credential stuffing detection error:', error)
      // Fallback to in-memory
      inMemoryTracker.addAttempt(key)
      const count = inMemoryTracker.getAttempts(key, windowSeconds * 1000)
      return count >= threshold
    }
  }
  
  /**
   * Detect suspicious patterns
   * 
   * Analyzes security events for unusual patterns:
   * - Rapid API calls
   * - Unusual access patterns
   * - Privilege escalation attempts
   * 
   * @param event - Security event to analyze
   * @returns True if suspicious pattern detected
   */
  async detectSuspiciousPattern(event: { type: string; userId?: string; ip: string; details: Record<string, unknown> }): Promise<boolean> {
    // Implement pattern detection logic based on event type
    // This is a placeholder for more sophisticated pattern detection
    
    // Example: Detect rapid API calls (more than 100 requests in 1 minute)
    if (event.type === 'rapid_api_calls') {
      const key = `pattern:rapid:${event.ip}`
      const windowSeconds = 60
      const threshold = 100
      
      try {
        if (!this.redis) {
          inMemoryTracker.addAttempt(key)
          const count = inMemoryTracker.getAttempts(key, windowSeconds * 1000)
          return count >= threshold
        }
        
        const now = Date.now()
        const windowStart = now - (windowSeconds * 1000)
        
        const uniqueId = `${now}-${Math.random().toString(36).substr(2, 9)}`
        await this.redis.zadd(key, { score: now, member: uniqueId })
        await this.redis.zremrangebyscore(key, 0, windowStart)
        
        const count = await this.redis.zcard(key)
        await this.redis.expire(key, windowSeconds + 60)
        
        return count >= threshold
      } catch (error) {
        console.error('Suspicious pattern detection error:', error)
        return false
      }
    }
    
    // Add more pattern detection logic as needed
    return false
  }
  
  /**
   * Block an IP address
   * 
   * @param ip - IP address to block
   * @param durationSeconds - Block duration in seconds
   * @param reason - Reason for blocking
   */
  async blockIP(ip: string, durationSeconds: number, reason: string): Promise<void> {
    try {
      const supabase = await this.getSupabase()
      const expiresAt = new Date(Date.now() + durationSeconds * 1000).toISOString()
      
      await supabase.from('blocked_entities').insert({
        entity_type: 'ip',
        entity_identifier: ip,
        reason,
        expires_at: expiresAt
      })
      
      // Also cache in Redis for fast lookup
      if (this.redis) {
        const key = `blocked:ip:${ip}`
        await this.redis.setex(key, durationSeconds, '1')
      }
      
      console.log(`🚫 Blocked IP: ${ip} for ${durationSeconds}s - ${reason}`)
    } catch (error) {
      console.error('Error blocking IP:', error)
    }
  }
  
  /**
   * Block a user
   * 
   * @param userId - User ID to block
   * @param durationSeconds - Block duration in seconds
   * @param reason - Reason for blocking
   */
  async blockUser(userId: string, durationSeconds: number, reason: string): Promise<void> {
    try {
      const supabase = await this.getSupabase()
      const expiresAt = new Date(Date.now() + durationSeconds * 1000).toISOString()
      
      await supabase.from('blocked_entities').insert({
        entity_type: 'user',
        entity_identifier: userId,
        reason,
        expires_at: expiresAt
      })
      
      // Also cache in Redis for fast lookup
      if (this.redis) {
        const key = `blocked:user:${userId}`
        await this.redis.setex(key, durationSeconds, '1')
      }
      
      console.log(`🚫 Blocked User: ${userId} for ${durationSeconds}s - ${reason}`)
    } catch (error) {
      console.error('Error blocking user:', error)
    }
  }
  
  /**
   * Check if an entity is blocked
   * 
   * @param type - Entity type ('ip' or 'user')
   * @param identifier - Entity identifier (IP address or user ID)
   * @returns True if blocked
   */
  async isBlocked(type: 'ip' | 'user', identifier: string): Promise<boolean> {
    try {
      // Check Redis cache first for fast lookup
      if (this.redis) {
        const key = `blocked:${type}:${identifier}`
        const cached = await this.redis.get(key)
        if (cached) {
          return true
        }
      }
      
      // Check database
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('blocked_entities')
        .select('*')
        .eq('entity_type', type)
        .eq('entity_identifier', identifier)
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .single()
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error checking blocked status:', error)
        return false
      }
      
      return !!data
    } catch (error) {
      console.error('Error checking blocked status:', error)
      return false
    }
  }
  
  /**
   * Log a threat event to the database
   * 
   * @param event - Threat event to log
   */
  async logThreatEvent(event: ThreatEvent): Promise<void> {
    try {
      const supabase = await this.getSupabase()
      
      await supabase.from('security_events').insert({
        tenant_id: event.tenantId || null,
        user_id: event.userId || null,
        event_type: event.type,
        severity: event.severity,
        ip_address: event.ip,
        details: event.details,
        created_at: event.timestamp
      })
      
      console.log(`🔒 Security Event: ${event.type} (${event.severity}) from ${event.ip}`)
    } catch (error) {
      console.error('Error logging threat event:', error)
    }
  }
  
  /**
   * Get active threats from the last 24 hours
   * 
   * @returns Array of recent threat events
   */
  async getActiveThreats(): Promise<ThreatEvent[]> {
    try {
      const supabase = await this.getSupabase()
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .gte('created_at', oneDayAgo)
        .order('created_at', { ascending: false })
        .limit(100)
      
      if (error) {
        console.error('Error fetching active threats:', error)
        return []
      }
      
      return (data || []).map(row => ({
        type: row.event_type as ThreatEvent['type'],
        severity: row.severity as ThreatEvent['severity'],
        userId: row.user_id || undefined,
        tenantId: row.tenant_id || undefined,
        ip: row.ip_address,
        details: row.details || {},
        timestamp: row.created_at
      }))
    } catch (error) {
      console.error('Error fetching active threats:', error)
      return []
    }
  }
}

// Export singleton instance
export const intrusionDetectionSystem = new IntrusionDetectionSystem()
