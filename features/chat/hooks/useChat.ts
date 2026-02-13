// Main chat logic hook
import { useState, useEffect, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { UserRole } from '@/lib/permissions/roles'
import { canViewConversation } from '@/lib/permissions/chat'
import { chatService } from '../services'
import { createClient } from '@/lib/supabase/client'

export function useChat() {
  const supabase = createClient()
  const socketRef = useRef<Socket | null>(null)
  const serviceUrl = process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL || 'http://localhost:3001'
  
  const [conversations, setConversations] = useState<any[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<UserRole>('agent')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  const selectedConversation = conversations.find(c => c.id === selectedConversationId)

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      conv.contact?.name?.toLowerCase().includes(query) ||
      conv.contact?.phone_number?.includes(query) ||
      conv.last_message?.toLowerCase().includes(query)
    )
  })

  // Initialize chat
  const initializeChat = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('No user found')
        return
      }

      setUserId(user.id)

      // Get user profile to check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      // @ts-ignore
      const role = (profile?.role || 'agent') as UserRole
      setUserRole(role)

      // Use service to get session
      const session = await chatService.getActiveSession(user.id, role)
      
      if (session) {
        // @ts-ignore
        setSessionId(session.id)
      } else {
        console.warn('❌ No active WhatsApp session found')
      }

      await loadConversations(user.id, role)
    } catch (error) {
      console.error('Error initializing chat:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Load conversations
  const loadConversations = useCallback(async (uid?: string, role?: UserRole) => {
    try {
      const currentUserId = uid || userId
      const currentRole = role || userRole
      
      if (!currentUserId) return

      // Use service to get conversations
      const data = await chatService.conversations.getConversations(currentUserId, currentRole)

      if (data) {
        // Filter by permission
        const filtered = data.filter(conv => 
          canViewConversation(currentRole, currentUserId, conv)
        )
        
        setConversations(filtered)
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
    }
  }, [userId, userRole])

  // Setup socket connection and Supabase Realtime
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout
    
    // Socket.IO for WhatsApp messages
    const checkServiceAndConnect = async () => {
      try {
        const response = await fetch(`${serviceUrl}/health`, { 
          method: 'GET',
          signal: AbortSignal.timeout(2000)
        })
        
        if (response.ok) {
          socketRef.current = io(serviceUrl, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 3,
            timeout: 5000,
          })

          socketRef.current.on('message', () => {
            clearTimeout(debounceTimer)
            debounceTimer = setTimeout(() => loadConversations(), 500)
          })

          socketRef.current.on('message_status', () => {
            clearTimeout(debounceTimer)
            debounceTimer = setTimeout(() => loadConversations(), 500)
          })
        }
      } catch (error) {
        // Silent fail
      }
    }

    checkServiceAndConnect()

    // Supabase Realtime for database changes
    const conversationsChannel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          clearTimeout(debounceTimer)
          debounceTimer = setTimeout(() => loadConversations(), 300)
        }
      )
      .subscribe()

    return () => {
      clearTimeout(debounceTimer)
      socketRef.current?.disconnect()
      conversationsChannel.unsubscribe()
    }
  }, [serviceUrl, loadConversations, supabase])

  // Initialize on mount
  useEffect(() => {
    initializeChat()
  }, []) // Remove initializeChat from deps to prevent infinite loop

  // Refresh conversations when userId or userRole changes
  useEffect(() => {
    if (userId && userRole) {
      loadConversations(userId, userRole)
    }
  }, [userId, userRole])

  return {
    conversations,
    filteredConversations,
    selectedConversation,
    selectedConversationId,
    setSelectedConversationId,
    userId,
    userRole,
    sessionId,
    searchQuery,
    setSearchQuery,
    loading,
    refreshConversations: loadConversations,
  }
}
