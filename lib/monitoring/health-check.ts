import { createClient } from '@/lib/supabase/server'
import { getRedisClient } from '@/lib/cache/redis'
import { createLogger } from './logger'

const logger = createLogger('health-check')

/**
 * Component health status
 * Validates: Requirements 18.3, 18.4, 18.5, 18.8
 */
export interface ComponentHealth {
  status: 'up' | 'down' | 'degraded'
  responseTime: number
  message?: string
}

/**
 * Overall system health status
 * Validates: Requirements 18.6, 18.7, 18.8
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  checks: {
    database: ComponentHealth
    redis: ComponentHealth
    whatsapp_api: ComponentHealth
    storage: ComponentHealth
  }
}

/**
 * HealthCheckService - System health monitoring
 * 
 * Validates: Requirements 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 18.9, 18.10
 * 
 * Features:
 * - Checks database connectivity (Supabase PostgreSQL)
 * - Checks Redis connectivity (Upstash Redis)
 * - Checks external API connectivity (WhatsApp Meta API)
 * - Checks storage connectivity (Supabase Storage)
 * - Returns component status (up, down, degraded)
 * - Tracks response times for each component
 * - Executes quickly (under 1 second with 5 second timeout per check)
 * - Does not require authentication
 */
export class HealthCheckService {
  private readonly checkTimeout = 5000 // 5 seconds max per check

  /**
   * Check overall system health
   * Validates: Requirements 18.1, 18.2, 18.6, 18.7, 18.8, 18.10
   */
  async checkHealth(): Promise<HealthStatus> {
    const startTime = Date.now()

    try {
      // Run all checks in parallel for speed
      const [database, redis, whatsapp_api, storage] = await Promise.all([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkExternalAPI(),
        this.checkStorage(),
      ])

      // Determine overall status
      const checks = { database, redis, whatsapp_api, storage }
      const status = this.determineOverallStatus(checks)

      const totalTime = Date.now() - startTime
      logger.info({
        message: 'Health check completed',
        status,
        totalTime,
        checks,
      })

      return {
        status,
        timestamp: new Date().toISOString(),
        checks,
      }
    } catch (error) {
      logger.error({
        message: 'Health check failed',
        error: error instanceof Error ? error.message : String(error),
      })

      // Return unhealthy status if health check itself fails
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: {
          database: { status: 'down', responseTime: 0, message: 'Health check failed' },
          redis: { status: 'down', responseTime: 0, message: 'Health check failed' },
          whatsapp_api: { status: 'down', responseTime: 0, message: 'Health check failed' },
          storage: { status: 'down', responseTime: 0, message: 'Health check failed' },
        },
      }
    }
  }

  /**
   * Check database connectivity
   * Validates: Requirement 18.3
   */
  async checkDatabase(): Promise<ComponentHealth> {
    const startTime = Date.now()

    try {
      const supabase = await createClient()

      // Simple query to verify database connectivity
      const { error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .maybeSingle()

      const responseTime = Date.now() - startTime

      if (error) {
        logger.warn({
          message: 'Database check failed',
          error: error.message,
          responseTime,
        })

        return {
          status: 'down',
          responseTime,
          message: 'Database connection failed',
        }
      }

      // Check if response time is degraded (> 500ms)
      const status = responseTime > 500 ? 'degraded' : 'up'

      return {
        status,
        responseTime,
        message: status === 'degraded' ? 'Slow response time' : undefined,
      }
    } catch (error) {
      const responseTime = Date.now() - startTime

      logger.error({
        message: 'Database check error',
        error: error instanceof Error ? error.message : String(error),
        responseTime,
      })

      return {
        status: 'down',
        responseTime,
        message: error instanceof Error ? error.message : 'Database check failed',
      }
    }
  }

  /**
   * Check Redis connectivity
   * Validates: Requirement 18.4
   */
  async checkRedis(): Promise<ComponentHealth> {
    const startTime = Date.now()

    try {
      const redis = getRedisClient()

      // Redis is optional, so if not configured, return degraded status
      if (!redis) {
        return {
          status: 'degraded',
          responseTime: 0,
          message: 'Redis not configured',
        }
      }

      // Simple ping to verify Redis connectivity
      const pingResult = await this.withTimeout(
        redis.ping(),
        this.checkTimeout,
        'Redis ping timeout'
      )

      const responseTime = Date.now() - startTime

      if (pingResult !== 'PONG') {
        logger.warn({
          message: 'Redis check failed',
          pingResult,
          responseTime,
        })

        return {
          status: 'down',
          responseTime,
          message: 'Redis ping failed',
        }
      }

      // Check if response time is degraded (> 200ms)
      const status = responseTime > 200 ? 'degraded' : 'up'

      return {
        status,
        responseTime,
        message: status === 'degraded' ? 'Slow response time' : undefined,
      }
    } catch (error) {
      const responseTime = Date.now() - startTime

      logger.error({
        message: 'Redis check error',
        error: error instanceof Error ? error.message : String(error),
        responseTime,
      })

      // Redis is optional, so return degraded instead of down
      return {
        status: 'degraded',
        responseTime,
        message: error instanceof Error ? error.message : 'Redis check failed',
      }
    }
  }

  /**
   * Check external API connectivity (WhatsApp Meta API)
   * Validates: Requirement 18.5
   */
  async checkExternalAPI(): Promise<ComponentHealth> {
    const startTime = Date.now()

    try {
      // Check if WhatsApp API is configured
      const apiToken = process.env.WHATSAPP_API_TOKEN
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

      if (!apiToken || !phoneNumberId) {
        return {
          status: 'degraded',
          responseTime: 0,
          message: 'WhatsApp API not configured',
        }
      }

      // Make a simple API call to verify connectivity
      // Using the phone number endpoint which is lightweight
      const apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0'
      const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}`

      const response = await this.withTimeout(
        fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiToken}`,
          },
        }),
        this.checkTimeout,
        'WhatsApp API timeout'
      )

      const responseTime = Date.now() - startTime

      if (!response.ok) {
        logger.warn({
          message: 'WhatsApp API check failed',
          status: response.status,
          statusText: response.statusText,
          responseTime,
        })

        return {
          status: 'down',
          responseTime,
          message: `WhatsApp API returned ${response.status}`,
        }
      }

      // Check if response time is degraded (> 1000ms)
      const status = responseTime > 1000 ? 'degraded' : 'up'

      return {
        status,
        responseTime,
        message: status === 'degraded' ? 'Slow response time' : undefined,
      }
    } catch (error) {
      const responseTime = Date.now() - startTime

      logger.error({
        message: 'WhatsApp API check error',
        error: error instanceof Error ? error.message : String(error),
        responseTime,
      })

      return {
        status: 'down',
        responseTime,
        message: error instanceof Error ? error.message : 'WhatsApp API check failed',
      }
    }
  }

  /**
   * Check storage connectivity (Supabase Storage)
   * Validates: Requirement 18.5
   */
  async checkStorage(): Promise<ComponentHealth> {
    const startTime = Date.now()

    try {
      const supabase = await createClient()

      // List buckets to verify storage connectivity
      const { error } = await supabase.storage.listBuckets()

      const responseTime = Date.now() - startTime

      if (error) {
        logger.warn({
          message: 'Storage check failed',
          error: error.message,
          responseTime,
        })

        return {
          status: 'down',
          responseTime,
          message: 'Storage connection failed',
        }
      }

      // Check if response time is degraded (> 500ms)
      const status = responseTime > 500 ? 'degraded' : 'up'

      return {
        status,
        responseTime,
        message: status === 'degraded' ? 'Slow response time' : undefined,
      }
    } catch (error) {
      const responseTime = Date.now() - startTime

      logger.error({
        message: 'Storage check error',
        error: error instanceof Error ? error.message : String(error),
        responseTime,
      })

      return {
        status: 'down',
        responseTime,
        message: error instanceof Error ? error.message : 'Storage check failed',
      }
    }
  }

  /**
   * Determine overall system status based on component statuses
   * Validates: Requirements 18.6, 18.7
   */
  private determineOverallStatus(checks: HealthStatus['checks']): HealthStatus['status'] {
    const statuses = Object.values(checks).map((check) => check.status)

    // If any critical component is down, system is unhealthy
    // Database and storage are critical; Redis and WhatsApp API are not
    if (checks.database.status === 'down' || checks.storage.status === 'down') {
      return 'unhealthy'
    }

    // If any component is down or degraded, system is degraded
    if (statuses.includes('down') || statuses.includes('degraded')) {
      return 'degraded'
    }

    // All components are up
    return 'healthy'
  }

  /**
   * Helper to add timeout to promises
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
      ),
    ])
  }
}

// Export singleton instance
export const healthCheckService = new HealthCheckService()
