// Main chat logic hook
import { useState, useEffect, useCallback } from 'react'
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
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          // Update specific fields only, preserve relations
          setConversations(prev => {
            const updated = prev.map(conv => 
              conv.id === payload.new.id 
                ? { 
                    ...conv,
                    status: payload.new.status,
                    workflow_status: payload.new.workflow_status,
                    last_message: payload.new.last_message,
                    last_message_at: payload.new.last_message_at,
                    assigned_to: payload.new.assigned_to,
                    unread_count: payload.new.unread_count,
                    updated_at: payload.new.updated_at
                  }
                : conv
            )
            // Re-sort by last_message_at
            return updated.sort((a, b) => {
              const aTime = new Date(a.last_message_at || 0).getTime()
              const bTime = new Date(b.last_message_at || 0).getTime()
              return bTime - aTime
            })
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          // New conversation - full refresh needed to get relations
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
        (payload) => {
          // New message - update conversation immediately
          const conversationId = payload.new.conversation_id
          
          // Update the conversation's last_message_at to trigger re-sort
          setConversations(prev => {
            const updated = prev.map(conv => 
              conv.id === conversationId
                ? { 
                    ...conv, 
                    last_message_at: payload.new.created_at,
                    last_message: payload.new.content,
                    unread_count: (conv.unread_count || 0) + 1
                  }
                : conv
            )
            // Re-sort by last_message_at
            return updated.sort((a, b) => {
              const aTime = new Date(a.last_message_at || 0).getTime()
              const bTime = new Date(b.last_message_at || 0).getTime()
              return bTime - aTime
            })
          })
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
