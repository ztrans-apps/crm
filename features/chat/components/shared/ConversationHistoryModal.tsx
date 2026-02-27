// Conversation History Modal - Read-only view with exact ChatWindow styling
'use client'

import { useState, useEffect, useRef } from 'react'
import { X, RefreshCw, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { chatService } from '@/features/chat/services'
import { MessagesList } from '@/features/chat/components/shared'

interface ConversationHistoryModalProps {
  conversationId: string | null
  onClose: () => void
}

// Helper functions
const getDisplayName = (contact: any) => {
  if (contact?.name && contact.name.trim()) {
    return contact.name
  }
  return contact?.phone_number || 'Unknown'
}

const getAvatarInitial = (contact: any) => {
  if (contact?.name && contact.name.trim()) {
    return contact.name.charAt(0).toUpperCase()
  }
  return contact?.phone_number?.replace(/\D/g, '').charAt(0) || 'U'
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function ConversationHistoryModal({
  conversationId,
  onClose
}: ConversationHistoryModalProps) {
  const [conversation, setConversation] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (conversationId) {
      loadConversationData()
    }
  }, [conversationId])

  const loadConversationData = async () => {
    if (!conversationId) return

    try {
      setLoading(true)

      // Load conversation with closed_by profile
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select(`
          *,
          contact:contacts!inner(id, name, phone_number, email, metadata),
          whatsapp_session:whatsapp_sessions(id),
          assigned_agent:profiles!conversations_assigned_to_fkey(id, full_name, email)
        `)
        .eq('id', conversationId)
        .single()

      if (convError) throw convError

      // Separately load closed_by profile if exists
      // @ts-ignore
      if (convData?.closed_by) {
        const { data: closedByProfile } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          // @ts-ignore
          .eq('id', convData.closed_by)
          .single()
        
        if (closedByProfile) {
          // @ts-ignore
          convData.closed_by_profile = closedByProfile
        }
      }

      const messagesData = await chatService.messages.getMessages(conversationId, 100, 0)

      setConversation(convData)
      setMessages(messagesData || [])
    } catch (error) {
      console.error('Error loading conversation:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!conversationId) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-vx-surface rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col">
        {/* Modal Header with Close Button */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-vx-surface-elevated">
          <h2 className="text-sm font-semibold text-vx-text-secondary">Conversation History</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-vx-surface-hover rounded-full transition-colors"
          >
            <X className="h-4 w-4 text-vx-text-muted" />
          </button>
        </div>

        {/* Chat Window Content - Exact replica */}
        <div className="flex-1 flex flex-col bg-vx-surface-elevated relative min-h-0">
          {/* Chat Header - Same as ChatWindow */}
          <div className="bg-vx-surface p-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full vx-gradient flex items-center justify-center text-white text-sm font-semibold">
                  {conversation ? getAvatarInitial(conversation.contact) : 'U'}
                </div>
                <div>
                  <h3 className="font-semibold text-base">
                    {conversation ? getDisplayName(conversation.contact) : 'Loading...'}
                  </h3>
                  <div className="flex items-center space-x-2 text-xs text-vx-text-muted">
                    <span>{conversation?.contact?.phone_number}</span>
                    {conversation?.assigned_to && (
                      <>
                        <span>•</span>
                        <span className="text-vx-purple">Assigned</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Status indicators */}
              <div className="flex items-center space-x-2">
                {conversation?.status === 'closed' && (
                  <span className="px-2 py-1 bg-vx-surface-hover text-vx-text-secondary text-xs rounded-full">
                    Selesai
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Read-only notice - Same style as closed conversation notice */}
          <div className="bg-yellow-50 dark:bg-yellow-500/10 border-b border-yellow-200 dark:border-yellow-500/20 px-3 py-2">
            <div className="flex items-center justify-center gap-2 text-xs text-yellow-800 dark:text-yellow-400">
              <span>⚠️ Read-only mode: This conversation is closed.</span>
              {conversation?.closed_by_profile && conversation?.closed_at && (
                <span className="font-medium">
                  • Closed by {conversation.closed_by_profile.full_name} on {formatDateTime(conversation.closed_at)}
                </span>
              )}
            </div>
          </div>

          {/* Messages Area - Same as ChatWindow */}
          <div className="flex-1 relative min-h-0">
            <div 
              ref={messagesContainerRef}
              className="absolute inset-0 overflow-y-auto p-3 scroll-smooth"
            >
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-vx-text-muted">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vx-teal mx-auto mb-2"></div>
                    <p className="text-sm">Loading messages...</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-vx-text-muted">
                  <p>No messages yet</p>
                </div>
              ) : (
                <>
                  <MessagesList
                    messages={messages}
                    translations={{}}
                    translating={{}}
                    onTranslate={() => {}}
                    onReply={() => {}}
                  />
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </div>

          {/* Input Area Placeholder - Disabled state */}
          <div className="bg-vx-surface border-t p-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-vx-surface-hover rounded-lg border border-vx-border">
              <MessageSquare className="h-4 w-4 text-vx-text-muted" />
              <span className="text-sm text-vx-text-muted flex-1">
                Cannot reply to closed conversation
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

