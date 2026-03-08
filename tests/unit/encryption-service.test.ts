// tests/unit/encryption-service.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { EncryptionService, isEncryptionConfigured } from '@/lib/security/encryption-service'

/**
 * Unit Tests for Encryption Service
 * 
 * Tests encryption and key management functionality:
 * - Data encryption at rest (Requirement 32.2)
 * - Encryption key rotation (Requirement 32.6)
 * - Tenant-specific encryption keys (Requirement 32.5)
 * - Keys are never exposed (Requirement 32.8)
 * 
 * Task 27.3: Test encryption and key management
 */

describe('EncryptionService', () => {
  let encryptionService: EncryptionService
  let originalMasterKey: string | undefined

  beforeAll(() => {
    // Save original master key
    originalMasterKey = process.env.ENCRYPTION_MASTER_KEY

    // Set test master key
    process.env.ENCRYPTION_MASTER_KEY = 'test-master-key-32-characters-long-for-testing-purposes'
    
    encryptionService = new EncryptionService()
  })

  afterAll(() => {
    // Restore original master key
    if (originalMasterKey) {
      process.env.ENCRYPTION_MASTER_KEY = originalMasterKey
    } else {
      delete process.env.ENCRYPTION_MASTER_KEY
    }
  })

  describe('Data Encryption at Rest (Requirement 32.2)', () => {
    it('should encrypt sensitive data using AES-256-GCM', async () => {
      const sensitiveData = 'user-password-123'
      const tenantId = 'tenant-001'

      const encrypted = await encryptionService.encrypt(sensitiveData, tenantId)

      // Verify encrypted data is different from original
      expect(encrypted).not.toBe(sensitiveData)
      
      // Verify encrypted data format: version:iv:authTag:ciphertext
      const parts = encrypted.split(':')
      expect(parts).toHaveLength(4)
      
      // Verify each part is base64 encoded
      parts.forEach((part, index) => {
        if (index === 0) {
          // Version should be a number
          expect(parseInt(part, 10)).toBeGreaterThan(0)
        } else {
          // Other parts should be base64
          expect(part).toMatch(/^[A-Za-z0-9+/=]+$/)
        }
      })
    })

    it('should decrypt encrypted data correctly', async () => {
      const originalData = 'sensitive-api-key-xyz'
      const tenantId = 'tenant-002'

      const encrypted = await encryptionService.encrypt(originalData, tenantId)
      const decrypted = await encryptionService.decrypt(encrypted, tenantId)

      expect(decrypted).toBe(originalData)
    })

    it('should encrypt and decrypt empty strings', async () => {
      const emptyData = ''
      const tenantId = 'tenant-003'

      const encrypted = await encryptionService.encrypt(emptyData, tenantId)
      const decrypted = await encryptionService.decrypt(encrypted, tenantId)

      expect(decrypted).toBe(emptyData)
    })

    it('should encrypt and decrypt long strings', async () => {
      const longData = 'A'.repeat(10000)
      const tenantId = 'tenant-004'

      const encrypted = await encryptionService.encrypt(longData, tenantId)
      const decrypted = await encryptionService.decrypt(encrypted, tenantId)

      expect(decrypted).toBe(longData)
    })

    it('should encrypt and decrypt special characters', async () => {
      const specialData = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`'
      const tenantId = 'tenant-005'

      const encrypted = await encryptionService.encrypt(specialData, tenantId)
      const decrypted = await encryptionService.decrypt(encrypted, tenantId)

      expect(decrypted).toBe(specialData)
    })

    it('should encrypt and decrypt unicode characters', async () => {
      const unicodeData = '你好世界 🌍 مرحبا العالم'
      const tenantId = 'tenant-006'

      const encrypted = await encryptionService.encrypt(unicodeData, tenantId)
      const decrypted = await encryptionService.decrypt(encrypted, tenantId)

      expect(decrypted).toBe(unicodeData)
    })

    it('should encrypt objects correctly', async () => {
      const obj = {
        apiKey: 'secret-key-123',
        password: 'user-password',
        token: 'jwt-token-xyz',
        metadata: {
          created: '2024-01-01',
          expires: '2025-01-01'
        }
      }
      const tenantId = 'tenant-007'

      const encrypted = await encryptionService.encryptObject(obj, tenantId)
      const decrypted = await encryptionService.decryptObject(encrypted, tenantId)

      expect(decrypted).toEqual(obj)
    })

    it('should handle nested objects', async () => {
      const nestedObj = {
        level1: {
          level2: {
            level3: {
              secret: 'deeply-nested-secret'
            }
          }
        }
      }
      const tenantId = 'tenant-008'

      const encrypted = await encryptionService.encryptObject(nestedObj, tenantId)
      const decrypted = await encryptionService.decryptObject(encrypted, tenantId)

      expect(decrypted).toEqual(nestedObj)
    })

    it('should handle arrays in objects', async () => {
      const objWithArray = {
        secrets: ['secret1', 'secret2', 'secret3'],
        metadata: {
          tags: ['tag1', 'tag2']
        }
      }
      const tenantId = 'tenant-009'

      const encrypted = await encryptionService.encryptObject(objWithArray, tenantId)
      const decrypted = await encryptionService.decryptObject(encrypted, tenantId)

      expect(decrypted).toEqual(objWithArray)
    })
  })

  describe('Tenant-Specific Encryption Keys (Requirement 32.5)', () => {
    it('should use different keys for different tenants', async () => {
      const data = 'shared-data'
      const tenant1 = 'tenant-001'
      const tenant2 = 'tenant-002'

      const encrypted1 = await encryptionService.encrypt(data, tenant1)
      const encrypted2 = await encryptionService.encrypt(data, tenant2)

      // Same data encrypted with different tenant keys should produce different ciphertext
      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should not decrypt data with wrong tenant key', async () => {
      const data = 'tenant-specific-data'
      const tenant1 = 'tenant-001'
      const tenant2 = 'tenant-002'

      const encrypted = await encryptionService.encrypt(data, tenant1)

      // Attempting to decrypt with wrong tenant key should fail
      await expect(
        encryptionService.decrypt(encrypted, tenant2)
      ).rejects.toThrow()
    })

    it('should isolate tenant data through encryption', async () => {
      const tenant1Data = 'tenant-1-secret'
      const tenant2Data = 'tenant-2-secret'
      const tenant1 = 'tenant-001'
      const tenant2 = 'tenant-002'

      const encrypted1 = await encryptionService.encrypt(tenant1Data, tenant1)
      const encrypted2 = await encryptionService.encrypt(tenant2Data, tenant2)

      // Each tenant can only decrypt their own data
      const decrypted1 = await encryptionService.decrypt(encrypted1, tenant1)
      const decrypted2 = await encryptionService.decrypt(encrypted2, tenant2)

      expect(decrypted1).toBe(tenant1Data)
      expect(decrypted2).toBe(tenant2Data)

      // Cross-tenant decryption should fail
      await expect(
        encryptionService.decrypt(encrypted1, tenant2)
      ).rejects.toThrow()
      
      await expect(
        encryptionService.decrypt(encrypted2, tenant1)
      ).rejects.toThrow()
    })

    it('should derive consistent keys for same tenant', async () => {
      const data = 'consistent-data'
      const tenantId = 'tenant-001'

      const encrypted1 = await encryptionService.encrypt(data, tenantId)
      const encrypted2 = await encryptionService.encrypt(data, tenantId)

      // Both encryptions should be decryptable with same tenant key
      const decrypted1 = await encryptionService.decrypt(encrypted1, tenantId)
      const decrypted2 = await encryptionService.decrypt(encrypted2, tenantId)

      expect(decrypted1).toBe(data)
      expect(decrypted2).toBe(data)
    })
  })

  describe('Encryption Key Rotation (Requirement 32.6)', () => {
    it('should support key versioning', async () => {
      const data = 'versioned-data'
      const tenantId = 'tenant-001'
      const keyVersion1 = 1
      const keyVersion2 = 2

      const encrypted1 = await encryptionService.encrypt(data, tenantId, keyVersion1)
      const encrypted2 = await encryptionService.encrypt(data, tenantId, keyVersion2)

      // Different key versions should produce different ciphertext
      expect(encrypted1).not.toBe(encrypted2)

      // Both should be decryptable
      const decrypted1 = await encryptionService.decrypt(encrypted1, tenantId)
      const decrypted2 = await encryptionService.decrypt(encrypted2, tenantId)

      expect(decrypted1).toBe(data)
      expect(decrypted2).toBe(data)
    })

    it('should rotate keys successfully', async () => {
      const data = 'data-to-rotate'
      const tenantId = 'tenant-001'
      const oldVersion = 1
      const newVersion = 2

      // Encrypt with old key version
      const encryptedOld = await encryptionService.encrypt(data, tenantId, oldVersion)

      // Rotate to new key version
      const encryptedNew = await encryptionService.rotateKeys(
        encryptedOld,
        tenantId,
        newVersion
      )

      // Verify new encryption is different
      expect(encryptedNew).not.toBe(encryptedOld)

      // Verify new encryption uses new version
      const newParts = encryptedNew.split(':')
      expect(newParts[0]).toBe(newVersion.toString())

      // Verify data is still correct after rotation
      const decrypted = await encryptionService.decrypt(encryptedNew, tenantId)
      expect(decrypted).toBe(data)
    })

    it('should allow decryption of old data after key rotation', async () => {
      const data = 'legacy-data'
      const tenantId = 'tenant-001'
      const oldVersion = 1

      // Encrypt with old key version
      const encryptedOld = await encryptionService.encrypt(data, tenantId, oldVersion)

      // Old data should still be decryptable
      const decrypted = await encryptionService.decrypt(encryptedOld, tenantId)
      expect(decrypted).toBe(data)
    })

    it('should detect when key rotation is needed', () => {
      const currentVersion = 3
      const encryptedWithOldKey = '1:iv:tag:ciphertext'
      const encryptedWithCurrentKey = '3:iv:tag:ciphertext'

      expect(
        encryptionService.needsKeyRotation(currentVersion, encryptedWithOldKey)
      ).toBe(true)

      expect(
        encryptionService.needsKeyRotation(currentVersion, encryptedWithCurrentKey)
      ).toBe(false)
    })

    it('should calculate current key version based on tenant age', () => {
      const tenantId = 'tenant-001'
      
      // Tenant created 100 days ago (should be on version 2 with 90-day rotation)
      const tenantCreatedAt = new Date()
      tenantCreatedAt.setDate(tenantCreatedAt.getDate() - 100)

      const keyVersion = encryptionService.getCurrentKeyVersion(tenantId, tenantCreatedAt)
      
      // With 90-day rotation, 100 days = version 2
      expect(keyVersion).toBeGreaterThanOrEqual(2)
    })

    it('should handle multiple key rotations', async () => {
      const data = 'multi-rotation-data'
      const tenantId = 'tenant-001'

      // Start with version 1
      let encrypted = await encryptionService.encrypt(data, tenantId, 1)

      // Rotate through multiple versions
      for (let version = 2; version <= 5; version++) {
        encrypted = await encryptionService.rotateKeys(encrypted, tenantId, version)
        
        // Verify data is still correct after each rotation
        const decrypted = await encryptionService.decrypt(encrypted, tenantId)
        expect(decrypted).toBe(data)
        
        // Verify version is updated
        const parts = encrypted.split(':')
        expect(parts[0]).toBe(version.toString())
      }
    })
  })

  describe('Keys Never Exposed (Requirement 32.8)', () => {
    it('should not expose master key in encrypted output', async () => {
      const data = 'secret-data'
      const tenantId = 'tenant-001'
      const masterKey = process.env.ENCRYPTION_MASTER_KEY || ''

      const encrypted = await encryptionService.encrypt(data, tenantId)

      // Master key should not appear in encrypted output
      expect(encrypted).not.toContain(masterKey)
    })

    it('should not expose tenant ID in encrypted output', async () => {
      const data = 'secret-data'
      const tenantId = 'tenant-001-very-specific-id'

      const encrypted = await encryptionService.encrypt(data, tenantId)

      // Tenant ID should not appear directly in encrypted output
      expect(encrypted.toLowerCase()).not.toContain(tenantId.toLowerCase())
    })

    it('should not expose keys in error messages', async () => {
      const tenantId = 'tenant-001'
      const masterKey = process.env.ENCRYPTION_MASTER_KEY || ''

      try {
        await encryptionService.decrypt('invalid:encrypted:data', tenantId)
        expect.fail('Should have thrown an error')
      } catch (error) {
        const errorMessage = (error as Error).message

        // Error message should not contain master key
        expect(errorMessage).not.toContain(masterKey)
        
        // Error message should not contain tenant ID
        expect(errorMessage).not.toContain(tenantId)
        
        // Error message should be generic
        expect(errorMessage).toMatch(/failed to decrypt/i)
      }
    })

    it('should not expose keys in encryption errors', async () => {
      const tenantId = 'tenant-001'
      const masterKey = process.env.ENCRYPTION_MASTER_KEY || ''

      // Temporarily remove master key to trigger error
      delete process.env.ENCRYPTION_MASTER_KEY

      try {
        const newService = new EncryptionService()
        await newService.encrypt('data', tenantId)
        expect.fail('Should have thrown an error')
      } catch (error) {
        const errorMessage = (error as Error).message

        // Error message should not contain any key material
        expect(errorMessage).not.toContain(masterKey)
        expect(errorMessage).not.toContain(tenantId)
      } finally {
        // Restore master key
        process.env.ENCRYPTION_MASTER_KEY = masterKey
      }
    })

    it('should not log keys during normal operations', async () => {
      const data = 'logged-data'
      const tenantId = 'tenant-001'
      const masterKey = process.env.ENCRYPTION_MASTER_KEY || ''

      // Capture console output
      const consoleSpy = vi.spyOn(console, 'log')
      const consoleErrorSpy = vi.spyOn(console, 'error')

      await encryptionService.encrypt(data, tenantId)
      const encrypted = await encryptionService.encrypt(data, tenantId)
      await encryptionService.decrypt(encrypted, tenantId)

      // Check that no logs contain sensitive information
      const allLogs = [
        ...consoleSpy.mock.calls.flat(),
        ...consoleErrorSpy.mock.calls.flat()
      ].join(' ')

      expect(allLogs).not.toContain(masterKey)

      consoleSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Error Handling', () => {
    it('should throw error when master key is not configured', async () => {
      const originalKey = process.env.ENCRYPTION_MASTER_KEY
      delete process.env.ENCRYPTION_MASTER_KEY

      const newService = new EncryptionService()
      
      await expect(
        newService.encrypt('data', 'tenant-001')
      ).rejects.toThrow()

      // Restore key
      process.env.ENCRYPTION_MASTER_KEY = originalKey
    })

    it('should throw error for invalid encrypted data format', async () => {
      const tenantId = 'tenant-001'

      await expect(
        encryptionService.decrypt('invalid-format', tenantId)
      ).rejects.toThrow(/failed to decrypt/i)
    })

    it('should throw error for corrupted encrypted data', async () => {
      const data = 'original-data'
      const tenantId = 'tenant-001'

      const encrypted = await encryptionService.encrypt(data, tenantId)
      
      // Corrupt the ciphertext
      const parts = encrypted.split(':')
      parts[3] = 'corrupted-ciphertext'
      const corrupted = parts.join(':')

      await expect(
        encryptionService.decrypt(corrupted, tenantId)
      ).rejects.toThrow()
    })

    it('should throw error for tampered authentication tag', async () => {
      const data = 'original-data'
      const tenantId = 'tenant-001'

      const encrypted = await encryptionService.encrypt(data, tenantId)
      
      // Tamper with the authentication tag
      const parts = encrypted.split(':')
      parts[2] = 'tampered-auth-tag'
      const tampered = parts.join(':')

      await expect(
        encryptionService.decrypt(tampered, tenantId)
      ).rejects.toThrow()
    })

    it('should handle invalid JSON in decryptObject', async () => {
      const tenantId = 'tenant-001'
      
      // Encrypt invalid JSON
      const invalidJson = 'not-valid-json{'
      const encrypted = await encryptionService.encrypt(invalidJson, tenantId)

      await expect(
        encryptionService.decryptObject(encrypted, tenantId)
      ).rejects.toThrow()
    })
  })

  describe('Configuration', () => {
    it('should detect when encryption is configured', () => {
      // Ensure key is set
      const originalKey = process.env.ENCRYPTION_MASTER_KEY
      process.env.ENCRYPTION_MASTER_KEY = 'test-master-key-32-characters-long-for-testing-purposes'
      
      expect(isEncryptionConfigured()).toBe(true)
      
      // Restore if needed
      if (originalKey) {
        process.env.ENCRYPTION_MASTER_KEY = originalKey
      }
    })

    it('should detect when encryption is not configured', () => {
      const originalKey = process.env.ENCRYPTION_MASTER_KEY
      delete process.env.ENCRYPTION_MASTER_KEY

      expect(isEncryptionConfigured()).toBe(false)

      // Restore key
      process.env.ENCRYPTION_MASTER_KEY = originalKey
    })

    it('should use default key rotation period of 90 days', () => {
      const tenantId = 'tenant-001'
      const tenantCreatedAt = new Date()
      tenantCreatedAt.setDate(tenantCreatedAt.getDate() - 91)

      const keyVersion = encryptionService.getCurrentKeyVersion(tenantId, tenantCreatedAt)
      
      // After 91 days with 90-day rotation, should be on version 2
      expect(keyVersion).toBe(2)
    })

    it('should respect custom key rotation period', () => {
      const originalRotation = process.env.ENCRYPTION_KEY_ROTATION_DAYS
      process.env.ENCRYPTION_KEY_ROTATION_DAYS = '30'

      const tenantId = 'tenant-001'
      const tenantCreatedAt = new Date()
      tenantCreatedAt.setDate(tenantCreatedAt.getDate() - 31)

      const keyVersion = encryptionService.getCurrentKeyVersion(tenantId, tenantCreatedAt)
      
      // After 31 days with 30-day rotation, should be on version 2
      expect(keyVersion).toBe(2)

      // Restore original
      if (originalRotation) {
        process.env.ENCRYPTION_KEY_ROTATION_DAYS = originalRotation
      } else {
        delete process.env.ENCRYPTION_KEY_ROTATION_DAYS
      }
    })
  })

  describe('Security Properties', () => {
    it('should produce different ciphertext for same plaintext (IV randomization)', async () => {
      const data = 'same-plaintext'
      const tenantId = 'tenant-001'

      const encrypted1 = await encryptionService.encrypt(data, tenantId)
      const encrypted2 = await encryptionService.encrypt(data, tenantId)

      // Same plaintext should produce different ciphertext due to random IV
      expect(encrypted1).not.toBe(encrypted2)

      // Both should decrypt to same plaintext
      const decrypted1 = await encryptionService.decrypt(encrypted1, tenantId)
      const decrypted2 = await encryptionService.decrypt(encrypted2, tenantId)

      expect(decrypted1).toBe(data)
      expect(decrypted2).toBe(data)
    })

    it('should use authenticated encryption (GCM mode)', async () => {
      const data = 'authenticated-data'
      const tenantId = 'tenant-001'

      const encrypted = await encryptionService.encrypt(data, tenantId)
      
      // Verify format includes authentication tag
      const parts = encrypted.split(':')
      expect(parts).toHaveLength(4)
      
      // Authentication tag should be present (index 2)
      expect(parts[2]).toBeTruthy()
      expect(parts[2].length).toBeGreaterThan(0)
    })

    it('should prevent ciphertext tampering', async () => {
      const data = 'protected-data'
      const tenantId = 'tenant-001'

      const encrypted = await encryptionService.encrypt(data, tenantId)
      
      // Modify a single character in the ciphertext
      const parts = encrypted.split(':')
      const ciphertext = parts[3]
      const modified = ciphertext.substring(0, ciphertext.length - 1) + 'X'
      parts[3] = modified
      const tampered = parts.join(':')

      // Decryption should fail due to authentication tag mismatch
      await expect(
        encryptionService.decrypt(tampered, tenantId)
      ).rejects.toThrow()
    })
  })
})
