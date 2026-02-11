// Messages logic hook
import { useState, useEffect, useCallback } from 'react'
import { chatService } from '../services'
import type { MediaAttachment } from '@/lib/types/chat'

interface UseMessagesProps {
  conversationId: string | null
  sessionId: string | null
  userId: string | null
  onConversationsRefresh: () => void
}

export function useMessages({ 
  conversationId, 
  sessionId, 
  userId,
  onConversationsRefresh 
}: UseMessagesProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [translating, setTranslating] = useState<Record<string, boolean>>({})
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)

  // Load messages for conversation
  const loadMessages = useCallback(async (convId: string) => {
    try {
      setLoading(true)
      const data = await chatService.messages.getMessages(convId)
      const hasChanged = JSON.stringify(data) !== JSON.stringify(messages)
      if (hasChanged) {
        setMessages(data)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }, [messages])

  // Mark conversation as read
  const markAsRead = useCallback(async (convId: string) => {
    try {
      await chatService.conversations.markAsRead(convId)
      onConversationsRefresh()
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }, [onConversationsRefresh])

  // Send message
  const handleSendMessage = useCallback(async (
    conversation: any,
    media?: MediaAttachment
  ) => {
    if (!messageInput.trim() && !media) return

    if (!conversation) {
      alert('Silakan pilih conversation terlebih dahulu')
      return
    }

    if (!conversation.contact || !conversation.contact.phone_number) {
      alert('Error: Contact tidak ditemukan')
      return
    }

    if (!userId || !sessionId) {
      alert('Session tidak ditemukan')
      return
    }

    const tempMessage = messageInput
    setMessageInput('')

    try {
      setSending(true)

      // Format phone number properly
      const rawPhone = conversation.contact.phone_number
      console.log('Raw phone number from DB:', rawPhone)
      
      // Remove + and any spaces
      const phoneNumber = rawPhone.replace(/[\s+]/g, '')
      console.log('Cleaned phone number:', phoneNumber)
      
      // Validate phone number
      if (phoneNumber.length < 10 || phoneNumber.length > 15) {
        throw new Error(`Invalid phone number: ${phoneNumber} (length: ${phoneNumber.length})`)
      }
      
      const whatsappNumber = `${phoneNumber}@c.us`
      console.log('WhatsApp number:', whatsappNumber)

      // Use service to send message
      const result = await chatService.sendMessageWithWorkflow({
        sessionId,
        whatsappNumber,
        content: tempMessage,
        conversationId: conversation.id,
        userId,
        media,
      })

      if (result && result.success) {
        await loadMessages(conversation.id)
        onConversationsRefresh()
      } else {
        throw new Error(result?.error || 'Failed to send message')
      }
    } catch (error: any) {
      alert('Gagal mengirim pesan: ' + error.message)
      setMessageInput(tempMessage)
    } finally {
      setSending(false)
    }
  }, [messageInput, userId, sessionId, loadMessages, onConversationsRefresh])

  // Translate message
  const handleTranslate = useCallback(async (messageId: string) => {
    const message = messages.find((m) => m.id === messageId)
    if (!message || !message.content) return

    setTranslating((prev) => ({ ...prev, [messageId]: true }))

    try {
      const translated = await chatService.messages.translateMessage(message.content, 'id')
      setTranslations((prev) => ({ ...prev, [messageId]: translated }))
    } catch (error) {
      console.error('Translation error:', error)
    } finally {
      setTranslating((prev) => ({ ...prev, [messageId]: false }))
    }
  }, [messages])

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId)
      markAsRead(conversationId)
    } else {
      setMessages([])
    }
  }, [conversationId])

  return {
    messages,
    messageInput,
    setMessageInput,
    translations,
    translating,
    sending,
    loading,
    handleSendMessage,
    handleTranslate,
    markAsRead,
    refreshMessages: loadMessages,
  }
}
