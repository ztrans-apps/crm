// lib/security/key-management.ts

/**
 * Key Management Configuration
 * 
 * Manages encryption key lifecycle including:
 * - Key storage (environment variables or AWS KMS)
 * - Key rotation schedule (90 days)
 * - Old key retention for decryption
 * - Key security best practices
 * 
 * Requirements: 32.6, 32.7, 32.8
 */

/**
 * Key Management Configuration
 */
export const KEY_MANAGEMENT_CONFIG = {
  /**
   * Key rotation period in days
   * Default: 90 days (3 months)
   */
  rotationPeriodDays: 90,

  /**
   * Old key retention period in days
   * Keep old keys for decryption during rotation period
   * Default: 180 days (6 months)
   */
  oldKeyRetentionDays: 180,

  /**
   * Key derivation algorithm
   * Using scrypt for CPU and memory hard key derivation
   */
  derivationAlgorithm: 'scrypt',

  /**
   * Encryption algorithm
   * AES-256-GCM provides authenticated encryption
   */
  encryptionAlgorithm: 'aes-256-gcm',

  /**
   * Key length in bytes
   * 32 bytes = 256 bits
   */
  keyLength: 32,
}

/**
 * Environment variable names for encryption keys
 */
export const KEY_ENV_VARS = {
  /**
   * Master encryption key
   * Used to derive tenant-specific keys
   * CRITICAL: Never log or expose this value
   */
  masterKey: 'ENCRYPTION_MASTER_KEY',

  /**
   * Key rotation period override
   * Optional: Defaults to 90 days
   */
  rotationDays: 'ENCRYPTION_KEY_ROTATION_DAYS',

  /**
   * AWS KMS Key ID (optional)
   * If using AWS KMS for key management
   */
  kmsKeyId: 'AWS_KMS_KEY_ID',

  /**
   * AWS Region for KMS (optional)
   */
  kmsRegion: 'AWS_KMS_REGION',
}

/**
 * Key Management Best Practices
 * 
 * 1. STORAGE:
 *    - Store master key in secure environment variables
 *    - Use AWS KMS or similar key management service in production
 *    - Never commit keys to version control
 *    - Use different keys for development, staging, and production
 * 
 * 2. ROTATION:
 *    - Rotate keys every 90 days
 *    - Keep old keys for decryption during rotation period
 *    - Automate key rotation process
 *    - Log key rotation events for audit
 * 
 * 3. ACCESS CONTROL:
 *    - Limit access to master key to authorized personnel only
 *    - Use IAM roles for AWS KMS access
 *    - Implement least privilege principle
 *    - Monitor key access and usage
 * 
 * 4. SECURITY:
 *    - Never log encryption keys
 *    - Never expose keys in error messages
 *    - Never send keys over network
 *    - Use secure key derivation (scrypt)
 *    - Use authenticated encryption (AES-GCM)
 * 
 * 5. BACKUP:
 *    - Backup master key securely
 *    - Store backup in separate location
 *    - Test key recovery process
 *    - Document key recovery procedures
 */

/**
 * Validate encryption configuration
 * Checks that required environment variables are set
 * 
 * @throws Error if configuration is invalid
 */
export function validateEncryptionConfig(): void {
  const masterKey = process.env[KEY_ENV_VARS.masterKey]
  
  if (!masterKey) {
    throw new Error(
      `${KEY_ENV_VARS.masterKey} environment variable is required for encryption`
    )
  }

  // Validate key length (should be at least 32 characters for security)
  if (masterKey.length < 32) {
    throw new Error(
      `${KEY_ENV_VARS.masterKey} must be at least 32 characters long`
    )
  }

  // Validate rotation period if provided
  const rotationDays = process.env[KEY_ENV_VARS.rotationDays]
  if (rotationDays) {
    const days = parseInt(rotationDays, 10)
    if (isNaN(days) || days < 1) {
      throw new Error(
        `${KEY_ENV_VARS.rotationDays} must be a positive integer`
      )
    }
  }
}

/**
 * Get key rotation schedule
 * Returns the next rotation date based on tenant creation date
 * 
 * @param tenantCreatedAt - Tenant creation date
 * @returns Next key rotation date
 */
export function getNextRotationDate(tenantCreatedAt: Date): Date {
  const rotationPeriodMs = KEY_MANAGEMENT_CONFIG.rotationPeriodDays * 24 * 60 * 60 * 1000
  const now = new Date()
  const timeSinceCreation = now.getTime() - tenantCreatedAt.getTime()
  const rotationsSinceCreation = Math.floor(timeSinceCreation / rotationPeriodMs)
  
  const nextRotationTime = tenantCreatedAt.getTime() + 
    (rotationsSinceCreation + 1) * rotationPeriodMs
  
  return new Date(nextRotationTime)
}

/**
 * Check if key rotation is due
 * 
 * @param tenantCreatedAt - Tenant creation date
 * @returns True if key rotation is due
 */
export function isKeyRotationDue(tenantCreatedAt: Date): boolean {
  const nextRotation = getNextRotationDate(tenantCreatedAt)
  return new Date() >= nextRotation
}

/**
 * Generate a secure random master key
 * Use this to generate a new master key for initial setup
 * 
 * @param length - Key length in bytes (default: 32)
 * @returns Base64-encoded random key
 */
export function generateMasterKey(length: number = 32): string {
  const { randomBytes } = require('crypto')
  return randomBytes(length).toString('base64')
}

/**
 * Key Management Documentation
 * 
 * ## Setup Instructions
 * 
 * 1. Generate a master key:
 *    ```bash
 *    node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 *    ```
 * 
 * 2. Add to environment variables:
 *    ```bash
 *    ENCRYPTION_MASTER_KEY=<generated_key>
 *    ENCRYPTION_KEY_ROTATION_DAYS=90
 *    ```
 * 
 * 3. For production, use AWS KMS:
 *    ```bash
 *    AWS_KMS_KEY_ID=<kms_key_id>
 *    AWS_KMS_REGION=us-east-1
 *    ```
 * 
 * ## Key Rotation Process
 * 
 * 1. Automated rotation runs every 90 days
 * 2. New key version is generated
 * 3. New data is encrypted with new key
 * 4. Old data is re-encrypted on access (lazy rotation)
 * 5. Old keys are retained for 180 days
 * 6. Rotation events are logged for audit
 * 
 * ## Security Considerations
 * 
 * - Master key must be at least 32 characters (256 bits)
 * - Use different keys for each environment
 * - Never commit keys to version control
 * - Rotate keys regularly (90 days)
 * - Monitor key access and usage
 * - Backup keys securely
 * - Test key recovery process
 * 
 * ## Compliance
 * 
 * - GDPR: Encryption at rest for personal data
 * - PCI DSS: Strong cryptography for cardholder data
 * - HIPAA: Encryption of ePHI
 * - SOC 2: Encryption controls
 */
