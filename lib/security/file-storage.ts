import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

/**
 * File upload options
 */
export interface FileUploadOptions {
  tenantId: string
  userId: string
  file: File
  type: 'image' | 'video' | 'audio' | 'document'
  maxSize?: number
  allowedMimeTypes?: string[]
}

/**
 * Stored file metadata
 */
export interface StoredFile {
  id: string
  tenant_id: string
  user_id: string
  filename: string
  original_filename: string
  mime_type: string
  size: number
  storage_path: string
  checksum: string
  created_at: string
}

/**
 * MIME type whitelist by file type
 */
const MIME_TYPE_WHITELIST: Record<string, string[]> = {
  image: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ],
  video: [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm'
  ],
  audio: [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/webm'
  ],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv'
  ]
}

/**
 * Default size limits by file type (in bytes)
 */
const DEFAULT_SIZE_LIMITS: Record<string, number> = {
  image: 10 * 1024 * 1024, // 10MB
  video: 50 * 1024 * 1024, // 50MB
  audio: 20 * 1024 * 1024, // 20MB
  document: 10 * 1024 * 1024 // 10MB
}

/**
 * File Storage Service
 * 
 * Provides secure file upload and storage with:
 * - File type validation (MIME type whitelist)
 * - Size limits
 * - Filename sanitization
 * - Checksum generation
 * - Tenant isolation
 * - Signed URL generation
 * 
 * @example
 * ```typescript
 * const fileStorage = new FileStorageService()
 * 
 * // Upload file
 * const storedFile = await fileStorage.uploadFile({
 *   tenantId: 'tenant-123',
 *   userId: 'user-456',
 *   file: uploadedFile,
 *   type: 'image'
 * })
 * 
 * // Get signed URL for download
 * const url = await fileStorage.getSignedUrl(storedFile.id, tenantId, 3600)
 * ```
 */
export class FileStorageService {
  /**
   * Upload a file to storage
   * 
   * @param options - File upload options
   * @returns Stored file metadata
   * @throws Error if validation fails
   */
  async uploadFile(options: FileUploadOptions): Promise<StoredFile> {
    // Validate file
    await this.validateFile(options.file, options)
    
    // Generate unique filename
    const extension = this.getFileExtension(options.file.name)
    const uniqueFilename = `${crypto.randomUUID()}${extension}`
    
    // Generate storage path (tenant-specific directory)
    const storagePath = `${options.tenantId}/${options.type}/${uniqueFilename}`
    
    // Calculate checksum
    const checksum = await this.calculateChecksum(options.file)
    
    // Upload to Supabase Storage
    const supabase = await createClient()
    const fileBuffer = await options.file.arrayBuffer()
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(storagePath, fileBuffer, {
        contentType: options.file.type,
        upsert: false
      })
    
    if (uploadError) {
      throw new Error(`File upload failed: ${uploadError.message}`)
    }
    
    // Store metadata in database
    const { data: fileRecord, error: dbError } = await supabase
      .from('file_uploads')
      .insert({
        tenant_id: options.tenantId,
        user_id: options.userId,
        filename: uniqueFilename,
        original_filename: this.sanitizeFilename(options.file.name),
        mime_type: options.file.type,
        size_bytes: options.file.size,
        storage_path: storagePath,
        checksum,
        malware_scanned: false,
        malware_detected: false
      })
      .select()
      .single()
    
    if (dbError) {
      // Cleanup uploaded file if database insert fails
      await supabase.storage.from('uploads').remove([storagePath])
      throw new Error(`Failed to store file metadata: ${dbError.message}`)
    }
    
    return {
      id: fileRecord.id,
      tenant_id: fileRecord.tenant_id,
      user_id: fileRecord.user_id,
      filename: fileRecord.filename,
      original_filename: fileRecord.original_filename,
      mime_type: fileRecord.mime_type,
      size: fileRecord.size_bytes,
      storage_path: fileRecord.storage_path,
      checksum: fileRecord.checksum,
      created_at: fileRecord.created_at
    }
  }
  
  /**
   * Get file metadata
   * 
   * @param fileId - File ID
   * @param tenantId - Tenant ID for isolation check
   * @returns File metadata
   * @throws Error if file not found or access denied
   */
  async getFile(fileId: string, tenantId: string): Promise<StoredFile> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('file_uploads')
      .select('*')
      .eq('id', fileId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()
    
    if (error || !data) {
      throw new Error('File not found or access denied')
    }
    
    return {
      id: data.id,
      tenant_id: data.tenant_id,
      user_id: data.user_id,
      filename: data.filename,
      original_filename: data.original_filename,
      mime_type: data.mime_type,
      size: data.size_bytes,
      storage_path: data.storage_path,
      checksum: data.checksum,
      created_at: data.created_at
    }
  }
  
  /**
   * Generate signed URL for file download
   * 
   * @param fileId - File ID
   * @param tenantId - Tenant ID for isolation check
   * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
   * @returns Signed URL
   * @throws Error if file not found or access denied
   */
  async getSignedUrl(fileId: string, tenantId: string, expiresIn: number = 3600): Promise<string> {
    // Get file metadata and verify tenant access
    const file = await this.getFile(fileId, tenantId)
    
    // Generate signed URL
    const supabase = await createClient()
    const { data, error } = await supabase.storage
      .from('uploads')
      .createSignedUrl(file.storage_path, expiresIn)
    
    if (error || !data) {
      throw new Error('Failed to generate signed URL')
    }
    
    return data.signedUrl
  }
  
  /**
   * Delete a file (soft delete)
   * 
   * @param fileId - File ID
   * @param tenantId - Tenant ID for isolation check
   * @throws Error if file not found or access denied
   */
  async deleteFile(fileId: string, tenantId: string): Promise<void> {
    const supabase = await createClient()
    
    // Soft delete in database
    const { error } = await supabase
      .from('file_uploads')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', fileId)
      .eq('tenant_id', tenantId)
    
    if (error) {
      throw new Error('Failed to delete file')
    }
    
    // Note: Physical file deletion can be done by a background job
    // to allow for recovery period
  }
  
  /**
   * Scan file for malware (placeholder)
   * 
   * In production, integrate with:
   * - ClamAV
   * - VirusTotal API
   * - AWS GuardDuty
   * - Cloud-based scanning service
   * 
   * @param fileId - File ID
   * @returns True if file is clean, false if malware detected
   */
  async scanForMalware(fileId: string): Promise<boolean> {
    // Placeholder implementation
    // In production, implement actual malware scanning
    
    const supabase = await createClient()
    
    // Update scan status
    await supabase
      .from('file_uploads')
      .update({
        malware_scanned: true,
        malware_detected: false
      })
      .eq('id', fileId)
    
    return true // Assume clean for now
  }
  
  /**
   * Validate file before upload
   * 
   * Checks:
   * - MIME type against whitelist
   * - File size against limits
   * - File extension matches MIME type
   * 
   * @param file - File to validate
   * @param options - Upload options
   * @throws Error if validation fails
   */
  async validateFile(file: File, options: FileUploadOptions): Promise<boolean> {
    // Check MIME type
    const allowedMimeTypes = options.allowedMimeTypes || MIME_TYPE_WHITELIST[options.type] || []
    if (!allowedMimeTypes.includes(file.type)) {
      throw new Error(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`)
    }
    
    // Check file size
    const maxSize = options.maxSize || DEFAULT_SIZE_LIMITS[options.type] || 10 * 1024 * 1024
    if (file.size > maxSize) {
      throw new Error(`File too large. Maximum size: ${this.formatBytes(maxSize)}`)
    }
    
    // Check file extension matches MIME type
    const extension = this.getFileExtension(file.name).toLowerCase()
    if (!this.isValidExtensionForMimeType(extension, file.type)) {
      throw new Error('File extension does not match MIME type')
    }
    
    return true
  }
  
  /**
   * Calculate SHA-256 checksum for file
   * 
   * @param file - File to hash
   * @returns Hex-encoded checksum
   */
  private async calculateChecksum(file: File): Promise<string> {
    const buffer = await file.arrayBuffer()
    const hash = crypto.createHash('sha256')
    hash.update(Buffer.from(buffer))
    return hash.digest('hex')
  }
  
  /**
   * Sanitize filename to prevent path traversal and other attacks
   * 
   * @param filename - Original filename
   * @returns Sanitized filename
   */
  private sanitizeFilename(filename: string): string {
    // Remove path separators and special characters
    return filename
      .replace(/[\/\\]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 255)
  }
  
  /**
   * Get file extension from filename
   * 
   * @param filename - Filename
   * @returns Extension with dot (e.g., '.jpg')
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.')
    return lastDot > 0 ? filename.substring(lastDot) : ''
  }
  
  /**
   * Check if file extension is valid for MIME type
   * 
   * @param extension - File extension (with dot)
   * @param mimeType - MIME type
   * @returns True if valid
   */
  private isValidExtensionForMimeType(extension: string, mimeType: string): boolean {
    const validExtensions: Record<string, string[]> = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'image/svg+xml': ['.svg'],
      'video/mp4': ['.mp4'],
      'video/mpeg': ['.mpeg', '.mpg'],
      'video/quicktime': ['.mov'],
      'video/webm': ['.webm'],
      'audio/mpeg': ['.mp3', '.mpeg'],
      'audio/wav': ['.wav'],
      'audio/ogg': ['.ogg'],
      'audio/webm': ['.webm'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv']
    }
    
    const allowed = validExtensions[mimeType] || []
    return allowed.includes(extension)
  }
  
  /**
   * Format bytes to human-readable string
   * 
   * @param bytes - Number of bytes
   * @returns Formatted string (e.g., "10 MB")
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }
}

// Export singleton instance
export const fileStorageService = new FileStorageService()
