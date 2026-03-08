// lib/security/encryption-service.ts
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

/**
 * Encryption Service
 * Provides AES-256-GCM encryption for sensitive data with tenant-specific keys
 * 
 * Features:
 * - AES-256-GCM encryption (authenticated encryption)
 * - Tenant-specific encryption keys
 * - Key rotation support
 * - Secure key derivation using scrypt
 * 
 * Requirements: 32.2, 32.3, 32.4, 32.5, 32.6
 */

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16 // 128 bits
const AUTH_TAG_LENGTH = 16 // 128 bits
const SALT_LENGTH = 32 // 256 bits

/**
 * Encryption configuration
 */
interface EncryptionConfig {
  masterKey: string
  keyRotationDays: number
}

/**
 * Get encryption configuration from environment
 */
function getEncryptionConfig(): EncryptionConfig {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY
  if (!masterKey) {
    throw new Error('ENCRYPTION_MASTER_KEY environment variable is required')
  }

  return {
    masterKey,
    keyRotationDays: parseInt(process.env.ENCRYPTION_KEY_ROTATION_DAYS || '90', 10),
  }
}

/**
 * Derive a tenant-specific encryption key from the master key
 * Uses scrypt for secure key derivation
 * 
 * @param tenantId - Tenant ID
 * @param keyVersion - Key version for rotation support
 * @returns Derived encryption key
 */
function deriveTenantKey(tenantId: string, keyVersion: number = 1): Buffer {
  const config = getEncryptionConfig()
  
  // Use tenant ID and key version as salt
  const salt = `${tenantId}:v${keyVersion}`
  
  // Derive key using scrypt (CPU and memory hard)
  const key = scryptSync(config.masterKey, salt, KEY_LENGTH)
  
  return key
}

/**
 * Encryption Service
 * Handles encryption and decryption of sensitive data
 */
export class EncryptionService {
  /**
   * Encrypt data using AES-256-GCM
   * 
   * @param data - Plain text data to encrypt
   * @param tenantId - Tenant ID for key derivation
   * @param keyVersion - Key version (for rotation)
   * @returns Encrypted data in format: version:iv:authTag:ciphertext (base64)
   */
  async encrypt(data: string, tenantId: string, keyVersion: number = 1): Promise<string> {
    try {
      // Derive tenant-specific key
      const key = deriveTenantKey(tenantId, keyVersion)
      
      // Generate random IV
      const iv = randomBytes(IV_LENGTH)
      
      // Create cipher
      const cipher = createCipheriv(ALGORITHM, key, iv)
      
      // Encrypt data
      let encrypted = cipher.update(data, 'utf8', 'base64')
      encrypted += cipher.final('base64')
      
      // Get authentication tag
      const authTag = cipher.getAuthTag()
      
      // Format: version:iv:authTag:ciphertext (all base64 encoded)
      const result = [
        keyVersion.toString(),
        iv.toString('base64'),
        authTag.toString('base64'),
        encrypted,
      ].join(':')
      
      return result
    } catch (error) {
      console.error('Encryption error:', error)
      throw new Error('Failed to encrypt data')
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   * 
   * @param encryptedData - Encrypted data in format: version:iv:authTag:ciphertext
   * @param tenantId - Tenant ID for key derivation
   * @returns Decrypted plain text data
   */
  async decrypt(encryptedData: string, tenantId: string): Promise<string> {
    try {
      // Parse encrypted data
      const parts = encryptedData.split(':')
      if (parts.length !== 4) {
        throw new Error('Invalid encrypted data format')
      }
      
      const [versionStr, ivBase64, authTagBase64, ciphertext] = parts
      const keyVersion = parseInt(versionStr, 10)
      
      // Derive tenant-specific key (using the version from encrypted data)
      const key = deriveTenantKey(tenantId, keyVersion)
      
      // Parse IV and auth tag
      const iv = Buffer.from(ivBase64, 'base64')
      const authTag = Buffer.from(authTagBase64, 'base64')
      
      // Create decipher
      const decipher = createDecipheriv(ALGORITHM, key, iv)
      decipher.setAuthTag(authTag)
      
      // Decrypt data
      let decrypted = decipher.update(ciphertext, 'base64', 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch (error) {
      console.error('Decryption error:', error)
      throw new Error('Failed to decrypt data')
    }
  }

  /**
   * Encrypt an object (converts to JSON first)
   * 
   * @param obj - Object to encrypt
   * @param tenantId - Tenant ID for key derivation
   * @param keyVersion - Key version (for rotation)
   * @returns Encrypted data
   */
  async encryptObject(
    obj: Record<string, unknown>,
    tenantId: string,
    keyVersion: number = 1
  ): Promise<string> {
    const json = JSON.stringify(obj)
    return this.encrypt(json, tenantId, keyVersion)
  }

  /**
   * Decrypt an object (parses JSON after decryption)
   * 
   * @param encryptedData - Encrypted data
   * @param tenantId - Tenant ID for key derivation
   * @returns Decrypted object
   */
  async decryptObject<T = Record<string, unknown>>(
    encryptedData: string,
    tenantId: string
  ): Promise<T> {
    const json = await this.decrypt(encryptedData, tenantId)
    return JSON.parse(json) as T
  }

  /**
   * Rotate encryption keys for a tenant
   * Re-encrypts data with a new key version
   * 
   * @param encryptedData - Data encrypted with old key
   * @param tenantId - Tenant ID
   * @param newKeyVersion - New key version
   * @returns Data re-encrypted with new key
   */
  async rotateKeys(
    encryptedData: string,
    tenantId: string,
    newKeyVersion: number
  ): Promise<string> {
    try {
      // Decrypt with old key (version is embedded in encrypted data)
      const decrypted = await this.decrypt(encryptedData, tenantId)
      
      // Re-encrypt with new key version
      const reencrypted = await this.encrypt(decrypted, tenantId, newKeyVersion)
      
      return reencrypted
    } catch (error) {
      console.error('Key rotation error:', error)
      throw new Error('Failed to rotate encryption keys')
    }
  }

  /**
   * Get current key version for a tenant
   * In a production system, this would be stored in a database
   * For now, we calculate based on tenant creation date and rotation period
   * 
   * @param tenantId - Tenant ID
   * @param tenantCreatedAt - Tenant creation date
   * @returns Current key version
   */
  getCurrentKeyVersion(tenantId: string, tenantCreatedAt: Date): number {
    const config = getEncryptionConfig()
    const now = new Date()
    const daysSinceCreation = Math.floor(
      (now.getTime() - tenantCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
    )
    
    // Calculate key version based on rotation period
    const keyVersion = Math.floor(daysSinceCreation / config.keyRotationDays) + 1
    
    return keyVersion
  }

  /**
   * Check if a key needs rotation
   * 
   * @param currentVersion - Current key version
   * @param encryptedData - Encrypted data (contains version)
   * @returns True if key rotation is needed
   */
  needsKeyRotation(currentVersion: number, encryptedData: string): boolean {
    try {
      const parts = encryptedData.split(':')
      if (parts.length !== 4) {
        return false
      }
      
      const dataVersion = parseInt(parts[0], 10)
      return dataVersion < currentVersion
    } catch (error) {
      return false
    }
  }
}

/**
 * Singleton instance
 */
export const encryptionService = new EncryptionService()

/**
 * Utility function to check if encryption is configured
 */
export function isEncryptionConfigured(): boolean {
  return !!process.env.ENCRYPTION_MASTER_KEY
}
