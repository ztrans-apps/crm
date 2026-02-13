// Notification hook for new messages
import { useEffect, useRef } from 'react'

interface UseNotificationProps {
  conversations: any[]
  selectedConversationId: string | null
}

export function useNotification({ conversations, selectedConversationId }: UseNotificationProps) {
  const previousUnreadCount = useRef<number>(0)
  const notificationSound = useRef<HTMLAudioElement | null>(null)

  // Initialize notification sound
  useEffect(() => {
    // Create audio element for notification sound
    notificationSound.current = new Audio('/notification.mp3')
    notificationSound.current.volume = 0.5
  }, [])

  // Check for new unread messages
  useEffect(() => {
    const totalUnread = conversations.reduce((sum, conv) => {
      // Don't count unread for currently selected conversation
      if (conv.id === selectedConversationId) return sum
      return sum + (conv.unread_count || 0)
    }, 0)

    // If unread count increased, show notification
    if (totalUnread > previousUnreadCount.current) {
      const newMessages = totalUnread - previousUnreadCount.current
      
      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Pesan Baru', {
          body: `Anda memiliki ${newMessages} pesan baru`,
          icon: '/favicon.ico',
          tag: 'new-message',
        })
      }

      // Play sound
      if (notificationSound.current) {
        notificationSound.current.play().catch(err => {
        })
      }

      // Update page title
      document.title = `(${totalUnread}) WhatsApp CRM`
    } else if (totalUnread === 0) {
      // Reset title when no unread
      document.title = 'WhatsApp CRM'
    }

    previousUnreadCount.current = totalUnread
  }, [conversations, selectedConversationId])

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  return null
}
