import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FileStorageService } from '@/lib/security/file-storage'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

describe('FileStorageService', () => {
  let fileStorage: FileStorageService
  let mockSupabase: any
  
  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Setup mock Supabase client
    const mockStorageFrom = {
      upload: vi.fn(),
      remove: vi.fn(),
      createSignedUrl: vi.fn()
    }
    
    mockSupabase = {
      storage: {
        from: vi.fn(() => mockStorageFrom)
      },
      from: vi.fn(() => mockSupabase),
      insert: vi.fn(() => mockSupabase),
      select: vi.fn(() => mockSupabase),
      eq: vi.fn(() => mockSupabase),
      is: vi.fn(() => mockSupabase),
      update: vi.fn(() => mockSupabase),
      single: vi.fn()
    }
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(mockSupabase)
    
    fileStorage = new FileStorageService()
  })
  
  describe('validateFile', () => {
    it('should accept valid image file', async () => {
      const mockFile = new File(
        [new ArrayBuffer(1024)],
        'test.jpg',
        { type: 'image/jpeg' }
      )
      
      const options = {
        tenantId: 'tenant-123',
        userId: 'user-456',
        file: mockFile,
        type: 'image' as const
      }
      
      const result = await fileStorage.validateFile(mockFile, options)
      expect(result).toBe(true)
    })
    
    it('should reject invalid MIME type', async () => {
      const mockFile = new File(
        [new ArrayBuffer(1024)],
        'test.exe',
        { type: 'application/x-executable' }
      )
      
      const options = {
        tenantId: 'tenant-123',
        userId: 'user-456',
        file: mockFile,
        type: 'image' as const
      }
      
      await expect(fileStorage.validateFile(mockFile, options)).rejects.toThrow(/Invalid file type/)
    })
    
    it('should reject oversized file', async () => {
      const mockFile = new File(
        [new ArrayBuffer(20 * 1024 * 1024)], // 20MB
        'test.jpg',
        { type: 'image/jpeg' }
      )
      
      const options = {
        tenantId: 'tenant-123',
        userId: 'user-456',
        file: mockFile,
        type: 'image' as const
      }
      
      await expect(fileStorage.validateFile(mockFile, options)).rejects.toThrow(/File too large/)
    })
    
    it('should reject mismatched extension and MIME type', async () => {
      const mockFile = new File(
        [new ArrayBuffer(1024)],
        'test.png',
        { type: 'image/jpeg' }
      )
      
      const options = {
        tenantId: 'tenant-123',
        userId: 'user-456',
        file: mockFile,
        type: 'image' as const
      }
      
      await expect(fileStorage.validateFile(mockFile, options)).rejects.toThrow(/extension does not match/)
    })
    
    it('should respect custom size limit', async () => {
      const mockFile = new File(
        [new ArrayBuffer(2 * 1024 * 1024)], // 2MB
        'test.jpg',
        { type: 'image/jpeg' }
      )
      
      const options = {
        tenantId: 'tenant-123',
        userId: 'user-456',
        file: mockFile,
        type: 'image' as const,
        maxSize: 1 * 1024 * 1024 // 1MB limit
      }
      
      await expect(fileStorage.validateFile(mockFile, options)).rejects.toThrow(/File too large/)
    })
    
    it('should respect custom MIME type whitelist', async () => {
      const mockFile = new File(
        [new ArrayBuffer(1024)],
        'test.png',
        { type: 'image/png' }
      )
      
      const options = {
        tenantId: 'tenant-123',
        userId: 'user-456',
        file: mockFile,
        type: 'image' as const,
        allowedMimeTypes: ['image/jpeg'] // Only JPEG allowed
      }
      
      await expect(fileStorage.validateFile(mockFile, options)).rejects.toThrow(/Invalid file type/)
    })
  })
  
  describe('getFile', () => {
    it('should retrieve file metadata', async () => {
      const mockFileData = {
        id: 'file-123',
        tenant_id: 'tenant-123',
        user_id: 'user-456',
        filename: 'unique-file.jpg',
        original_filename: 'test.jpg',
        mime_type: 'image/jpeg',
        size_bytes: 1024,
        storage_path: 'tenant-123/image/unique-file.jpg',
        checksum: 'abc123',
        created_at: new Date().toISOString()
      }
      
      mockSupabase.single.mockResolvedValueOnce({
        data: mockFileData,
        error: null
      })
      
      const file = await fileStorage.getFile('file-123', 'tenant-123')
      
      expect(mockSupabase.from).toHaveBeenCalledWith('file_uploads')
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'file-123')
      expect(mockSupabase.eq).toHaveBeenCalledWith('tenant_id', 'tenant-123')
      expect(mockSupabase.is).toHaveBeenCalledWith('deleted_at', null)
      
      expect(file).toMatchObject({
        id: 'file-123',
        tenant_id: 'tenant-123',
        user_id: 'user-456',
        filename: 'unique-file.jpg',
        original_filename: 'test.jpg'
      })
    })
    
    it('should throw error when file not found', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: new Error('Not found')
      })
      
      await expect(fileStorage.getFile('file-123', 'tenant-123')).rejects.toThrow(/File not found/)
    })
    
    it('should enforce tenant isolation', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: new Error('Not found')
      })
      
      await expect(fileStorage.getFile('file-123', 'wrong-tenant')).rejects.toThrow(/File not found/)
      
      expect(mockSupabase.eq).toHaveBeenCalledWith('tenant_id', 'wrong-tenant')
    })
  })
  
  describe('getSignedUrl', () => {
    it('should generate signed URL with expiration', async () => {
      const mockFileData = {
        id: 'file-123',
        tenant_id: 'tenant-123',
        user_id: 'user-456',
        filename: 'unique-file.jpg',
        original_filename: 'test.jpg',
        mime_type: 'image/jpeg',
        size_bytes: 1024,
        storage_path: 'tenant-123/image/unique-file.jpg',
        checksum: 'abc123',
        created_at: new Date().toISOString()
      }
      
      mockSupabase.single.mockResolvedValueOnce({
        data: mockFileData,
        error: null
      })
      
      const mockSignedUrl = 'https://storage.example.com/signed-url'
      const mockStorageFrom = mockSupabase.storage.from()
      mockStorageFrom.createSignedUrl.mockResolvedValueOnce({
        data: { signedUrl: mockSignedUrl },
        error: null
      })
      
      const url = await fileStorage.getSignedUrl('file-123', 'tenant-123', 3600)
      
      expect(url).toBe(mockSignedUrl)
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('uploads')
      expect(mockStorageFrom.createSignedUrl).toHaveBeenCalledWith(
        'tenant-123/image/unique-file.jpg',
        3600
      )
    })
    
    it('should use default expiration of 1 hour', async () => {
      const mockFileData = {
        id: 'file-123',
        tenant_id: 'tenant-123',
        user_id: 'user-456',
        filename: 'unique-file.jpg',
        original_filename: 'test.jpg',
        mime_type: 'image/jpeg',
        size_bytes: 1024,
        storage_path: 'tenant-123/image/unique-file.jpg',
        checksum: 'abc123',
        created_at: new Date().toISOString()
      }
      
      mockSupabase.single.mockResolvedValueOnce({
        data: mockFileData,
        error: null
      })
      
      const mockStorageFrom = mockSupabase.storage.from()
      mockStorageFrom.createSignedUrl.mockResolvedValueOnce({
        data: { signedUrl: 'https://storage.example.com/signed-url' },
        error: null
      })
      
      await fileStorage.getSignedUrl('file-123', 'tenant-123')
      
      expect(mockStorageFrom.createSignedUrl).toHaveBeenCalledWith(
        expect.any(String),
        3600 // Default 1 hour
      )
    })
    
    it('should throw error when signed URL generation fails', async () => {
      const mockFileData = {
        id: 'file-123',
        tenant_id: 'tenant-123',
        user_id: 'user-456',
        filename: 'unique-file.jpg',
        original_filename: 'test.jpg',
        mime_type: 'image/jpeg',
        size_bytes: 1024,
        storage_path: 'tenant-123/image/unique-file.jpg',
        checksum: 'abc123',
        created_at: new Date().toISOString()
      }
      
      mockSupabase.single.mockResolvedValueOnce({
        data: mockFileData,
        error: null
      })
      
      const mockStorageFrom = mockSupabase.storage.from()
      mockStorageFrom.createSignedUrl.mockResolvedValueOnce({
        data: null,
        error: new Error('Failed to generate URL')
      })
      
      await expect(fileStorage.getSignedUrl('file-123', 'tenant-123')).rejects.toThrow(/Failed to generate signed URL/)
    })
  })
  
  describe('deleteFile', () => {
    it('should soft delete file', async () => {
      // Mock the chain: from().update().eq().eq() returns { error: null }
      const mockEqChain = {
        eq: vi.fn().mockResolvedValue({ error: null })
      }
      mockSupabase.eq.mockReturnValueOnce(mockEqChain)
      
      await fileStorage.deleteFile('file-123', 'tenant-123')
      
      expect(mockSupabase.from).toHaveBeenCalledWith('file_uploads')
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          deleted_at: expect.any(String)
        })
      )
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'file-123')
      expect(mockEqChain.eq).toHaveBeenCalledWith('tenant_id', 'tenant-123')
    })
    
    it('should throw error when deletion fails', async () => {
      const mockEqChain = {
        eq: vi.fn().mockResolvedValue({ error: new Error('Deletion failed') })
      }
      mockSupabase.eq.mockReturnValueOnce(mockEqChain)
      
      await expect(fileStorage.deleteFile('file-123', 'tenant-123')).rejects.toThrow(/Failed to delete file/)
    })
    
    it('should enforce tenant isolation on deletion', async () => {
      const mockEqChain = {
        eq: vi.fn().mockResolvedValue({ error: null })
      }
      mockSupabase.eq.mockReturnValueOnce(mockEqChain)
      
      await fileStorage.deleteFile('file-123', 'tenant-123')
      
      expect(mockEqChain.eq).toHaveBeenCalledWith('tenant_id', 'tenant-123')
    })
  })
  
  describe('scanForMalware', () => {
    it('should update scan status', async () => {
      mockSupabase.eq.mockResolvedValueOnce({
        error: null
      })
      
      const result = await fileStorage.scanForMalware('file-123')
      
      expect(result).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('file_uploads')
      expect(mockSupabase.update).toHaveBeenCalledWith({
        malware_scanned: true,
        malware_detected: false
      })
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'file-123')
    })
  })
})
