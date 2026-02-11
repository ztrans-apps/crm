// Messages logic hook
import { useState, useEffect, useCallback, useMemo } from 'react'
import { chatService } from '../services'
import { messageService } from '../services/message.service'
import { createClient } from '@/lib/supabase/client'
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
  const supabase = useMemo(() => createClient(), [])
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
      
      // Remove + and any spaces
      const phoneNumber = rawPhone.replace(/[\s+]/g, '')
      
      // Validate phone number
      if (phoneNumber.length < 10 || phoneNumber.length > 15) {
        throw new Error(`Invalid phone number: ${phoneNumber} (length: ${phoneNumber.length})`)
      }
      
      const whatsappNumber = `${phoneNumber}@c.us`

      // Handle media upload if present
      let mediaUrl = null
      let mediaFilename = null
      let mediaSize = null
      let mediaMimeType = null

      if (media && media.type === 'location') {
        // Handle location - no file upload needed
        const locationData = {
          latitude: media.latitude!,
          longitude: media.longitude!,
          address: media.address,
          name: media.name
        }
        
        // Send location via API
        const response = await fetch('/api/send-location', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            to: whatsappNumber,
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            address: locationData.address,
            name: locationData.name,
            conversationId: conversation.id,
            userId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }

        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to send location')
        }

        onConversationsRefresh()
        setSending(false)
        return
      }

      if (media && media.file) {
        mediaFilename = media.file.name
        mediaSize = media.file.size
        mediaMimeType = media.file.type

        // Upload to Supabase Storage
        const filePath = `${userId}/${conversation.id}/${Date.now()}_${mediaFilename}`
        
        const { error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(filePath, media.file, {
            contentType: media.file.type,
            upsert: false
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          throw new Error('Failed to upload media: ' + uploadError.message)
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('chat-media')
          .getPublicUrl(filePath)

        mediaUrl = urlData.publicUrl
      }

      // Send via API
      let result
      
      if (media && mediaUrl) {
        // Send media message
        // Download media from Supabase to send via WhatsApp
        const mediaResponse = await fetch(mediaUrl)
        if (!mediaResponse.ok) {
          throw new Error('Failed to fetch media from Supabase Storage')
        }
        
        const mediaBlob = await mediaResponse.blob()
        
        // Create FormData
        const formData = new FormData()
        formData.append('sessionId', sessionId)
        formData.append('to', whatsappNumber)
        formData.append('caption', tempMessage || '')
        formData.append('media', mediaBlob, mediaFilename!)
        formData.append('mimetype', mediaMimeType!)
        formData.append('conversationId', conversation.id)
        formData.append('userId', userId)
        formData.append('mediaUrl', mediaUrl)
        formData.append('mediaType', media.type)
        formData.append('mediaFilename', mediaFilename!)
        formData.append('mediaSize', mediaSize!.toString())
        
        const response = await fetch('/api/send-media', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }

        result = await response.json()
      } else {
        // Send text message (original flow)
        const response = await fetch('/api/send-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: sessionId,
            to: whatsappNumber,
            message: tempMessage,
            conversationId: conversation.id,
            userId: userId,
          }),
        })

        result = await response.json()
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to send message')
      }

      // Refresh conversations list
      onConversationsRefresh()
      
    } catch (error: any) {
      console.error('Send message error:', error)
      alert('Gagal mengirim pesan: ' + error.message)
      setMessageInput(tempMessage)
    } finally {
      setSending(false)
    }
  }, [messageInput, userId, sessionId, onConversationsRefresh])

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

  // Setup Supabase Realtime for messages
  useEffect(() => {
    if (!conversationId) return

    // Subscribe to messages changes for this conversation
    const messagesChannel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          // Fetch the complete message with relations
          const newMessage = await messageService.getMessage(payload.new.id)
          
          if (newMessage) {
            setMessages(prev => {
              // Check if message already exists
              const exists = prev.some(m => m.id === newMessage.id)
              if (exists) return prev
              
              // Add new message
              return [...prev, newMessage]
            })
            
            // Refresh conversations list to update last message
            onConversationsRefresh()
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          // Fetch the complete updated message
          const updatedMessage = await messageService.getMessage(payload.new.id)
          
          if (updatedMessage) {
            setMessages(prev => 
              prev.map(m => m.id === updatedMessage.id ? updatedMessage : m)
            )
          }
        }
      )
      .subscribe()

    return () => {
      messagesChannel.unsubscribe()
    }
  }, [conversationId, supabase, onConversationsRefresh])

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
