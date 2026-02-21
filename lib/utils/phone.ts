/**
 * Phone Number Utilities
 * Helper functions for phone number validation and formatting
 */

/**
 * Extract phone number from WhatsApp JID
 * JID format: 6285722839336@s.whatsapp.net
 * Returns: +6285722839336
 */
export function extractPhoneFromJID(jid: string): string {
  if (!jid) return ''
  
  // Remove @s.whatsapp.net or @g.us suffix
  const phone = jid.split('@')[0]
  
  // Add + prefix if not present
  return phone.startsWith('+') ? phone : `+${phone}`
}

/**
 * Validate Indonesian phone number
 * Valid formats:
 * - 08xxxxxxxxxx (10-13 digits)
 * - 628xxxxxxxxxx (11-14 digits)
 * - +628xxxxxxxxxx (12-15 digits)
 */
export function isValidIndonesianPhone(phone: string): boolean {
  if (!phone) return false
  
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '')
  
  // Check Indonesian phone patterns
  const patterns = [
    /^08\d{8,11}$/,        // 08xxxxxxxxxx
    /^628\d{8,11}$/,       // 628xxxxxxxxxx
    /^\+628\d{8,11}$/,     // +628xxxxxxxxxx
  ]
  
  return patterns.some(pattern => pattern.test(cleaned))
}

/**
 * Normalize Indonesian phone number to international format
 * Input: 08123456789, 628123456789, +628123456789
 * Output: +628123456789
 */
export function normalizeIndonesianPhone(phone: string): string {
  if (!phone) return ''
  
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '')
  
  // Remove + temporarily for processing
  cleaned = cleaned.replace(/^\+/, '')
  
  // Convert 08xxx to 628xxx
  if (cleaned.startsWith('08')) {
    cleaned = '62' + cleaned.substring(1)
  }
  
  // Ensure it starts with 62
  if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned
  }
  
  // Add + prefix
  return '+' + cleaned
}

/**
 * Format phone number for display
 * Input: +6285722839336
 * Output: +62 857-2283-9336
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone) return ''
  
  // Normalize first
  const normalized = normalizeIndonesianPhone(phone)
  
  // Remove + for formatting
  const digits = normalized.replace(/^\+/, '')
  
  // Format: +62 8xx-xxxx-xxxx
  if (digits.startsWith('62')) {
    const countryCode = digits.substring(0, 2)  // 62
    const operator = digits.substring(2, 5)      // 8xx
    const part1 = digits.substring(5, 9)         // xxxx
    const part2 = digits.substring(9)            // xxxx
    
    return `+${countryCode} ${operator}-${part1}-${part2}`
  }
  
  return normalized
}

/**
 * Validate and clean phone number from WhatsApp
 * This function handles corrupted or malformed phone numbers
 */
export function validateAndCleanPhone(phone: string): string | null {
  if (!phone) return null
  
  // Extract from JID if needed
  if (phone.includes('@')) {
    phone = extractPhoneFromJID(phone)
  }
  
  // Normalize
  const normalized = normalizeIndonesianPhone(phone)
  
  // Validate
  if (!isValidIndonesianPhone(normalized)) {
    console.warn('[Phone Utils] Invalid phone number:', phone, '→', normalized)
    return null
  }
  
  return normalized
}

/**
 * Check if phone number looks corrupted
 * Corrupted patterns:
 * - Too long (> 15 digits)
 * - Contains repeated patterns
 * - Invalid country code
 */
export function isCorruptedPhone(phone: string): boolean {
  if (!phone) return true
  
  const cleaned = phone.replace(/[^\d]/g, '')
  
  // Too long
  if (cleaned.length > 15) {
    return true
  }
  
  // Too short
  if (cleaned.length < 10) {
    return true
  }
  
  // Check for repeated patterns (e.g., 123123123)
  const hasRepeatedPattern = /(\d{3,})\1{2,}/.test(cleaned)
  if (hasRepeatedPattern) {
    return true
  }
  
  // Invalid country code for Indonesian numbers
  if (cleaned.startsWith('62') && !cleaned.startsWith('628')) {
    // Indonesian mobile numbers must start with 628
    return true
  }
  
  return false
}

/**
 * Fix corrupted phone number if possible
 * Attempts to extract valid phone number from corrupted data
 */
export function fixCorruptedPhone(phone: string): string | null {
  if (!phone) return null
  
  console.log('[Phone Utils] Attempting to fix corrupted phone:', phone)
  
  // Remove all non-digits
  const digits = phone.replace(/[^\d]/g, '')
  
  // Try to find Indonesian mobile pattern (628xxxxxxxxxx)
  const indonesianPattern = /628\d{8,11}/
  const match = digits.match(indonesianPattern)
  
  if (match) {
    const fixed = '+' + match[0]
    console.log('[Phone Utils] Fixed phone number:', phone, '→', fixed)
    return fixed
  }
  
  // Try to find pattern starting with 08
  const localPattern = /08\d{8,11}/
  const localMatch = digits.match(localPattern)
  
  if (localMatch) {
    const fixed = '+62' + localMatch[0].substring(1)
    console.log('[Phone Utils] Fixed phone number:', phone, '→', fixed)
    return fixed
  }
  
  console.warn('[Phone Utils] Could not fix corrupted phone:', phone)
  return null
}

/**
 * Sanitize phone number for database storage
 * Ensures phone number is in correct format before saving
 */
export function sanitizePhoneForStorage(phone: string): string | null {
  if (!phone) return null
  
  // Check if corrupted
  if (isCorruptedPhone(phone)) {
    // Try to fix
    const fixed = fixCorruptedPhone(phone)
    if (fixed) {
      return fixed
    }
    return null
  }
  
  // Validate and clean
  return validateAndCleanPhone(phone)
}
