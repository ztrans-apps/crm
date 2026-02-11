// Response window utilities for WhatsApp 24-hour window
import type { ResponseWindowStatus } from '@/lib/types/chat'

/**
 * Calculate response window status
 */
export function calculateResponseWindow(
  lastCustomerMessageAt: string | null
): ResponseWindowStatus {
  if (!lastCustomerMessageAt) {
    return {
      isExpired: false,
      expiresAt: null,
      timeRemaining: null,
      warningShown: false,
    }
  }

  const lastMessageTime = new Date(lastCustomerMessageAt)
  const expiresAt = new Date(lastMessageTime.getTime() + 24 * 60 * 60 * 1000)
  const now = new Date()
  const isExpired = now > expiresAt

  if (isExpired) {
    return {
      isExpired: true,
      expiresAt: expiresAt.toISOString(),
      timeRemaining: null,
      warningShown: false,
    }
  }

  const msRemaining = expiresAt.getTime() - now.getTime()
  const timeRemaining = formatTimeRemaining(msRemaining)
  const warningShown = msRemaining < 60 * 60 * 1000 // Less than 1 hour

  return {
    isExpired: false,
    expiresAt: expiresAt.toISOString(),
    timeRemaining,
    warningShown,
  }
}

/**
 * Check if response window is expired
 */
export function isResponseWindowExpired(
  responseWindowExpiresAt: string | null
): boolean {
  if (!responseWindowExpiresAt) {
    return false
  }

  const expiresAt = new Date(responseWindowExpiresAt)
  const now = new Date()

  return now > expiresAt
}

/**
 * Format time remaining in human readable format
 */
export function formatTimeRemaining(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  } else if (minutes > 0) {
    return `${minutes}m`
  } else {
    return `${seconds}s`
  }
}

/**
 * Get response window expiration time (24 hours from now)
 */
export function getResponseWindowExpiration(): string {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  return expiresAt.toISOString()
}

/**
 * Get warning time (1 hour before expiration)
 */
export function getWarningTime(expiresAt: string): string {
  const expiration = new Date(expiresAt)
  const warningTime = new Date(expiration.getTime() - 60 * 60 * 1000)
  return warningTime.toISOString()
}

/**
 * Check if warning should be shown
 */
export function shouldShowWarning(
  responseWindowExpiresAt: string | null
): boolean {
  if (!responseWindowExpiresAt) {
    return false
  }

  const expiresAt = new Date(responseWindowExpiresAt)
  const now = new Date()
  const msRemaining = expiresAt.getTime() - now.getTime()

  // Show warning if less than 1 hour remaining
  return msRemaining > 0 && msRemaining < 60 * 60 * 1000
}

/**
 * Get response window status color
 */
export function getResponseWindowColor(status: ResponseWindowStatus): string {
  if (status.isExpired) {
    return 'red'
  } else if (status.warningShown) {
    return 'orange'
  } else {
    return 'green'
  }
}

/**
 * Get response window status text
 */
export function getResponseWindowText(status: ResponseWindowStatus): string {
  if (status.isExpired) {
    return 'Expired'
  } else if (status.timeRemaining) {
    return `${status.timeRemaining} left`
  } else {
    return 'Active'
  }
}

/**
 * Get response window icon
 */
export function getResponseWindowIcon(status: ResponseWindowStatus): string {
  if (status.isExpired) {
    return '⚠️'
  } else if (status.warningShown) {
    return '⏰'
  } else {
    return '✅'
  }
}

/**
 * Validate if message can be sent
 */
export function canSendMessage(
  responseWindowExpiresAt: string | null,
  isTemplate: boolean = false
): { canSend: boolean; reason?: string } {
  if (!responseWindowExpiresAt) {
    return { canSend: true }
  }

  const isExpired = isResponseWindowExpired(responseWindowExpiresAt)

  if (isExpired && !isTemplate) {
    return {
      canSend: false,
      reason: 'Response window expired. Please use a template message.',
    }
  }

  return { canSend: true }
}
