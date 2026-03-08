/**
 * Property Test: File Upload Validation
 * 
 * **Validates: Requirements 1.8**
 * 
 * Tests that:
 * - Invalid file types are rejected
 * - Oversized files are rejected
 * - Valid files are accepted
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fc from 'fast-check'
import { FileStorageService } from '@/lib/security/file-storage'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

describe('Property Test: File Upload Validation', () => {
  let fileStorage: FileStorageService
  
  beforeEach(() => {
    vi.clearAllMocks()
    fileStorage = new FileStorageService()
  })
  
  /**
   * Property: Invalid file types are rejected
   */
  it('should reject files with invalid MIME types', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate invalid MIME types
        fc.constantFrom(
          'application/x-executable',
          'application/x-msdownload',
          'application/x-sh',
          'text/javascript',
          'application/x-php',
          'text/html'
        ),
        fc.integer({ min: 1, max: 1024 * 1024 }), // File size
        fc.constantFrom('image', 'video', 'audio', 'document'), // File type
        async (invalidMimeType, fileSize, fileType) => {
          // Create mock file with invalid MIME type
          const mockFile = new File(
            [new ArrayBuffer(fileSize)],
            'test.exe',
            { type: invalidMimeType }
          )
          
          const options = {
            tenantId: 'tenant-123',
            userId: 'user-456',
            file: mockFile,
            type: fileType as 'image' | 'video' | 'audio' | 'document'
          }
          
          // Should throw error for invalid MIME type
          await expect(fileStorage.validateFile(mockFile, options)).rejects.toThrow(/Invalid file type/)
        }
      ),
      { numRuns: 10 }
    )
  })
  
  /**
   * Property: Oversized files are rejected
   */
  it('should reject files exceeding size limits', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate file sizes exceeding limits
        fc.record({
          type: fc.constantFrom('image', 'audio', 'document'),
          config: fc.oneof(
            fc.constant({ type: 'image', mimeType: 'image/jpeg', size: 15 * 1024 * 1024 }), // 15MB > 10MB limit
            fc.constant({ type: 'audio', mimeType: 'audio/mpeg', size: 25 * 1024 * 1024 }), // 25MB > 20MB limit
            fc.constant({ type: 'document', mimeType: 'application/pdf', size: 15 * 1024 * 1024 }) // 15MB > 10MB limit
          )
        }),
        async ({ config }) => {
          // Create mock file exceeding size limit
          const mockFile = new File(
            [new ArrayBuffer(config.size)],
            'large-file.dat',
            { type: config.mimeType }
          )
          
          const options = {
            tenantId: 'tenant-123',
            userId: 'user-456',
            file: mockFile,
            type: config.type as 'image' | 'video' | 'audio' | 'document'
          }
          
          // Should throw error for oversized file
          await expect(fileStorage.validateFile(mockFile, options)).rejects.toThrow(/File too large/)
        }
      ),
      { numRuns: 10 }
    )
  })
  
  /**
   * Property: Valid files are accepted
   */
  it('should accept files with valid MIME types and sizes', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid file configurations
        fc.oneof(
          fc.constant({ type: 'image', mimeType: 'image/jpeg', extension: '.jpg', maxSize: 10 * 1024 * 1024 }),
          fc.constant({ type: 'image', mimeType: 'image/png', extension: '.png', maxSize: 10 * 1024 * 1024 }),
          fc.constant({ type: 'video', mimeType: 'video/mp4', extension: '.mp4', maxSize: 50 * 1024 * 1024 }),
          fc.constant({ type: 'audio', mimeType: 'audio/mpeg', extension: '.mp3', maxSize: 20 * 1024 * 1024 }),
          fc.constant({ type: 'document', mimeType: 'application/pdf', extension: '.pdf', maxSize: 10 * 1024 * 1024 })
        ),
        fc.integer({ min: 1024, max: 5 * 1024 * 1024 }), // 1KB - 5MB (within all limits)
        async (config, size) => {
          // Ensure size is within limit
          const validSize = Math.min(size, config.maxSize - 1)
          
          // Create mock file with valid MIME type and size
          const mockFile = new File(
            [new ArrayBuffer(validSize)],
            `test${config.extension}`,
            { type: config.mimeType }
          )
          
          const options = {
            tenantId: 'tenant-123',
            userId: 'user-456',
            file: mockFile,
            type: config.type as 'image' | 'video' | 'audio' | 'document'
          }
          
          // Should not throw error for valid file
          const result = await fileStorage.validateFile(mockFile, options)
          expect(result).toBe(true)
        }
      ),
      { numRuns: 10 }
    )
  })
  
  /**
   * Property: File extension must match MIME type
   */
  it('should reject files with mismatched extension and MIME type', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          { type: 'image', mimeType: 'image/jpeg', wrongExtension: '.png' },
          { type: 'image', mimeType: 'image/png', wrongExtension: '.jpg' },
          { type: 'document', mimeType: 'application/pdf', wrongExtension: '.doc' },
          { type: 'video', mimeType: 'video/mp4', wrongExtension: '.avi' }
        ),
        async ({ type, mimeType, wrongExtension }) => {
          // Create mock file with mismatched extension
          const mockFile = new File(
            [new ArrayBuffer(1024)],
            `test${wrongExtension}`,
            { type: mimeType }
          )
          
          const options = {
            tenantId: 'tenant-123',
            userId: 'user-456',
            file: mockFile,
            type: type as 'image' | 'video' | 'audio' | 'document'
          }
          
          // Should throw error for mismatched extension
          await expect(fileStorage.validateFile(mockFile, options)).rejects.toThrow(/extension does not match/)
        }
      ),
      { numRuns: 10 }
    )
  })
  
  /**
   * Property: Custom size limits are respected
   */
  it('should respect custom size limits when provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1024, max: 1024 * 1024 }), // Custom max size (1KB - 1MB)
        fc.integer({ min: 1024 * 1024, max: 5 * 1024 * 1024 }), // File size exceeding custom limit
        async (customMaxSize, fileSize) => {
          // Create mock file exceeding custom limit
          const mockFile = new File(
            [new ArrayBuffer(fileSize)],
            'test.jpg',
            { type: 'image/jpeg' }
          )
          
          const options = {
            tenantId: 'tenant-123',
            userId: 'user-456',
            file: mockFile,
            type: 'image' as const,
            maxSize: customMaxSize
          }
          
          // Should throw error when file exceeds custom limit
          await expect(fileStorage.validateFile(mockFile, options)).rejects.toThrow(/File too large/)
        }
      ),
      { numRuns: 10 }
    )
  })
  
  /**
   * Property: Custom MIME type whitelist is respected
   */
  it('should respect custom MIME type whitelist when provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('image/jpeg', 'image/png'), // Allowed MIME types
        fc.constantFrom('image/gif', 'image/webp'), // Disallowed MIME types
        async (allowedMimeType, disallowedMimeType) => {
          // Create mock file with disallowed MIME type
          const mockFile = new File(
            [new ArrayBuffer(1024)],
            'test.gif',
            { type: disallowedMimeType }
          )
          
          const options = {
            tenantId: 'tenant-123',
            userId: 'user-456',
            file: mockFile,
            type: 'image' as const,
            allowedMimeTypes: [allowedMimeType]
          }
          
          // Should throw error for disallowed MIME type
          await expect(fileStorage.validateFile(mockFile, options)).rejects.toThrow(/Invalid file type/)
        }
      ),
      { numRuns: 10 }
    )
  })
})
