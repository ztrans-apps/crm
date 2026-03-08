// tests/property/encryption.property.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import * as fc from 'fast-check'
import { EncryptionService, isEncryptionConfigured } from '@/lib/security/encryption-service'

/**
 * Property-Based Tests for Encryption Service
 * 
 * Tests encryption properties including:
 * - Sensitive data encryption
 * - Tenant-specific encryption keys
 * - Encryption key rotation
 * - Encryption key non-exposure
 * 
 * Uses 10 iterations as specified in requirements
 */

describe('Encryption Service Properties', () => {
  let encryptionService: EncryptionService
  let encryptionConfigured: boolean

  beforeAll(() => {
    encryptionService = new EncryptionService()
    encryptionConfigured = isEncryptionConfigured()
    
    // Set up test encryption key if not configured
    if (!encryptionConfigured) {
      process.env.ENCRYPTION_MASTER_KEY = 'test-master-key-32-characters-long-for-testing-purposes'
      encryptionConfigured = true
    }
  })

  /**
   * Property 46: Sensitive Data Encryption
   * **Validates: Requirements 32.2, 32.3, 32.4**
   * 
   * For any sensitive data, it should be encrypted before storage and
   * decryption should return the original data
   */
  it('Property 46: Sensitive data should be encrypted and decryptable', async () => {
    if (!encryptionConfigured) {
      console.log('⚠️  Skipping test: Encryption not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          data: fc.string({ minLength: 1, maxLength: 1000 }),
          tenantId: fc.uuid(),
        }),
        async ({ data, tenantId }) => {
          // Encrypt the data
          const encrypted = await encryptionService.encrypt(data, tenantId)

          // Verify encrypted data is different from original
          expect(encrypted).not.toBe(data)

          // Verify encrypted data contains version, IV, auth tag, and ciphertext
          const parts = encrypted.split(':')
          expect(parts.length).toBe(4)

          // Verify version is a number
          const version = parseInt(parts[0], 10)
          expect(version).toBeGreaterThan(0)

          // Decrypt the data
          const decrypted = await encryptionService.decrypt(encrypted, tenantId)

          // Verify decrypted data matches original
          expect(decrypted).toBe(data)
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property 47: Tenant-Specific Encryption Keys
   * **Validates: Requirements 32.5**
   * 
   * For any two different tenants, data encrypted with one tenant's key
   * should not be decryptable with another tenant's key
   */
  it('Property 47: Different tenants should use different encryption keys', async () => {
    if (!encryptionConfigured) {
      console.log('⚠️  Skipping test: Encryption not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          data: fc.string({ minLength: 1, maxLength: 100 }),
          tenant1Id: fc.uuid(),
          tenant2Id: fc.uuid(),
        }),
        async ({ data, tenant1Id, tenant2Id }) => {
          // Skip if tenant IDs are the same
          if (tenant1Id === tenant2Id) {
            return
          }

          // Encrypt data with tenant1's key
          const encrypted = await encryptionService.encrypt(data, tenant1Id)

          // Attempt to decrypt with tenant2's key should fail
          let decryptionFailed = false
          try {
            await encryptionService.decrypt(encrypted, tenant2Id)
          } catch (error) {
            decryptionFailed = true
          }

          // Verify decryption with wrong tenant key fails
          expect(decryptionFailed).toBe(true)

          // Verify decryption with correct tenant key succeeds
          const decrypted = await encryptionService.decrypt(encrypted, tenant1Id)
          expect(decrypted).toBe(data)
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property 48: Encryption Key Rotation
   * **Validates: Requirements 32.6**
   * 
   * For any encrypted data, key rotation should allow decryption of old data
   * with new keys
   */
  it('Property 48: Key rotation should allow decryption with new keys', async () => {
    if (!encryptionConfigured) {
      console.log('⚠️  Skipping test: Encryption not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          data: fc.string({ minLength: 1, maxLength: 100 }),
          tenantId: fc.uuid(),
          oldKeyVersion: fc.integer({ min: 1, max: 5 }),
          newKeyVersion: fc.integer({ min: 6, max: 10 }),
        }),
        async ({ data, tenantId, oldKeyVersion, newKeyVersion }) => {
          // Encrypt data with old key version
          const encryptedOld = await encryptionService.encrypt(data, tenantId, oldKeyVersion)

          // Verify old data can be decrypted
          const decryptedOld = await encryptionService.decrypt(encryptedOld, tenantId)
          expect(decryptedOld).toBe(data)

          // Rotate keys: re-encrypt with new key version
          const encryptedNew = await encryptionService.rotateKeys(
            encryptedOld,
            tenantId,
            newKeyVersion
          )

          // Verify rotated data is different
          expect(encryptedNew).not.toBe(encryptedOld)

          // Verify rotated data uses new key version
          const newParts = encryptedNew.split(':')
          const newVersion = parseInt(newParts[0], 10)
          expect(newVersion).toBe(newKeyVersion)

          // Verify rotated data can be decrypted
          const decryptedNew = await encryptionService.decrypt(encryptedNew, tenantId)
          expect(decryptedNew).toBe(data)
        }
      ),
      { numRuns: 10 }
    )
  }, 10000) // 10 second timeout

  /**
   * Property 49: Encryption Key Non-Exposure
   * **Validates: Requirements 32.8**
   * 
   * For any encryption operation, encryption keys should never appear in
   * logs, error messages, or encrypted output
   */
  it('Property 49: Encryption keys should never be exposed', async () => {
    if (!encryptionConfigured) {
      console.log('⚠️  Skipping test: Encryption not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          data: fc.string({ minLength: 1, maxLength: 100 }),
          tenantId: fc.uuid(),
        }),
        async ({ data, tenantId }) => {
          // Get master key from environment
          const masterKey = process.env.ENCRYPTION_MASTER_KEY || ''

          // Encrypt the data
          const encrypted = await encryptionService.encrypt(data, tenantId)

          // Verify master key does not appear in encrypted output
          expect(encrypted).not.toContain(masterKey)

          // Verify tenant ID does not directly appear in encrypted output
          // (it's used for key derivation but shouldn't be visible)
          const encryptedLower = encrypted.toLowerCase()
          const tenantIdLower = tenantId.toLowerCase()
          expect(encryptedLower).not.toContain(tenantIdLower)

          // Test error message doesn't expose keys
          try {
            // Attempt to decrypt with invalid data
            await encryptionService.decrypt('invalid:data:format', tenantId)
          } catch (error) {
            const errorMessage = (error as Error).message
            // Verify error message doesn't contain master key
            expect(errorMessage).not.toContain(masterKey)
            // Verify error message doesn't contain tenant ID
            expect(errorMessage).not.toContain(tenantId)
          }
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Additional test: Object encryption and decryption
   */
  it('Should encrypt and decrypt objects correctly', async () => {
    if (!encryptionConfigured) {
      console.log('⚠️  Skipping test: Encryption not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          obj: fc.record({
            name: fc.string(),
            email: fc.emailAddress(),
            age: fc.integer({ min: 0, max: 120 }),
            active: fc.boolean(),
          }),
          tenantId: fc.uuid(),
        }),
        async ({ obj, tenantId }) => {
          // Encrypt the object
          const encrypted = await encryptionService.encryptObject(obj, tenantId)

          // Verify encrypted data is a string
          expect(typeof encrypted).toBe('string')

          // Decrypt the object
          const decrypted = await encryptionService.decryptObject(encrypted, tenantId)

          // Verify decrypted object matches original
          expect(decrypted).toEqual(obj)
        }
      ),
      { numRuns: 10 }
    )
  })
})
