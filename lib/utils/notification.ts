// Notification utilities for chat application

/**
 * Play notification sound using Web Audio API
 * Creates a pleasant two-tone notification sound
 */
export function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    
    // First tone (higher pitch)
    const oscillator1 = audioContext.createOscillator()
    const gainNode1 = audioContext.createGain()
    
    oscillator1.connect(gainNode1)
    gainNode1.connect(audioContext.destination)
    
    oscillator1.frequency.value = 800 // Hz
    oscillator1.type = 'sine'
    
    gainNode1.gain.setValueAtTime(0, audioContext.currentTime)
    gainNode1.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01)
    gainNode1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15)
    
    oscillator1.start(audioContext.currentTime)
    oscillator1.stop(audioContext.currentTime + 0.15)
    
    // Second tone (lower pitch) - plays after first
    const oscillator2 = audioContext.createOscillator()
    const gainNode2 = audioContext.createGain()
    
    oscillator2.connect(gainNode2)
    gainNode2.connect(audioContext.destination)
    
    oscillator2.frequency.value = 600 // Hz
    oscillator2.type = 'sine'
    
    const startTime = audioContext.currentTime + 0.1
    gainNode2.gain.setValueAtTime(0, startTime)
    gainNode2.gain.linearRampToValueAtTime(0.3, startTime + 0.01)
    gainNode2.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15)
    
    oscillator2.start(startTime)
    oscillator2.stop(startTime + 0.15)
    
    console.log('🔔 Notification sound played')
  } catch (error) {
    console.error('Error playing notification sound:', error)
  }
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Browser does not support notifications')
    return 'denied'
  }
  
  if (Notification.permission === 'granted') {
    return 'granted'
  }
  
  if (Notification.permission === 'denied') {
    return 'denied'
  }
  
  const permission = await Notification.requestPermission()
  console.log('Notification permission:', permission)
  return permission
}

/**
 * Show browser notification
 */
export function showNotification(
  title: string,
  options?: {
    body?: string
    icon?: string
    tag?: string
    data?: any
  }
) {
  if (!('Notification' in window)) {
    console.warn('Browser does not support notifications')
    return
  }
  
  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted')
    return
  }
  
  try {
    const notification = new Notification(title, {
      icon: options?.icon || '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    })
    
    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000)
    
    // Handle click
    notification.onclick = () => {
      window.focus()
      notification.close()
    }
    
    console.log('📬 Browser notification shown:', title)
  } catch (error) {
    console.error('Error showing notification:', error)
  }
}

/**
 * Check if notifications are supported and enabled
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window
}

/**
 * Check if notification permission is granted
 */
export function isNotificationEnabled(): boolean {
  return isNotificationSupported() && Notification.permission === 'granted'
}
