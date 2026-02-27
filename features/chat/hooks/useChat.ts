// Main chat logic hook
import { useState, useEffect, useCallback, useRef } from 'react'
import { canViewConversation, getUserRole } from '@/lib/rbac/chat-permissions'
import { chatService } from '../services'
import { createClient } from '@/lib/supabase/client'

export function useChat() {
  const supabase = createClient()
  
  const [conversations, setConversations] = useState<any[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('User')
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

      // Get user role from RBAC system
      const role = await getUserRole(user.id)
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
  const loadConversations = useCallback(async (uid?: string, role?: string) => {
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

  // Setup Supabase Realtime for live updates
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout

    // Listen for conversation changes
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_labels'
        },
        () => {
          clearTimeout(debounceTimer)
          debounceTimer = setTimeout(() => loadConversations(), 300)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          // Refresh conversations when new messages arrive (from webhook)
          clearTimeout(debounceTimer)
          debounceTimer = setTimeout(() => loadConversations(), 500)
        }
      )
      .subscribe()

    return () => {
      clearTimeout(debounceTimer)
      conversationsChannel.unsubscribe()
    }
  }, [loadConversations, supabase])

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
