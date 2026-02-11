// Chat window component with messages and input
'use client'

import { useRef, useState, useCallback } from 'react'
import { MessageSquare, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ConversationWithRelations, MessageWithRelations, MediaAttachment } from '@/lib/types/chat'
import { InputBar, MessagesList, BackToBottomButton } from '@/features/chat/components/shared'
import { useChatScrollBehavior } from '@/features/chat/hooks'

// Helper functions - outside component to avoid re-creation
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

interface ChatWindowProps {
  conversation: ConversationWithRelations | null
  messages: MessageWithRelations[]
  messageInput: string
  onMessageInputChange: (value: string) => void
  onSendMessage: (media?: MediaAttachment) => void
  onQuickReplyClick?: () => void
  onRefresh?: () => void
  onChatWindowClick?: () => void // Callback when user clicks in chat window
  translations: Record<string, string>
  onTranslate: (messageId: string) => void
  translating: Record<string, boolean>
  sending: boolean
  loading: boolean
  disabled?: boolean
}

export function ChatWindow({
  conversation,
  messages,
  messageInput,
  onMessageInputChange,
  onSendMessage,
  onQuickReplyClick,
  onRefresh,
  onChatWindowClick,
  translations,
  onTranslate,
  translating,
  sending,
  loading,
  disabled = false,
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [replyingTo, setReplyingTo] = useState<MessageWithRelations | null>(null)

  // Use chat scroll behavior hook
  const {
    showBackToBottom,
    newMessageCount,
    scrollToBottom,
    handleScroll,
    resetCounter,
  } = useChatScrollBehavior({
    messagesContainerRef: messagesContainerRef as React.RefObject<HTMLDivElement>,
    messages,
    conversationId: conversation?.id,
    enabled: !!conversation,
  })

  // Handle back to bottom button click
  const handleBackToBottomClick = useCallback(() => {
    scrollToBottom('smooth')
    resetCounter()
    // Focus back to input
    if (onChatWindowClick) {
      onChatWindowClick()
    }
  }, [scrollToBottom, resetCounter, onChatWindowClick])

  // Memoize handlers
  const handleReply = useCallback((message: MessageWithRelations) => {
    setReplyingTo(message)
  }, [])

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null)
  }, [])

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">Select a conversation to start chatting</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="flex-1 flex flex-col bg-gray-50"
      onClick={onChatWindowClick}
    >
      {/* Chat Header */}
      <div className="bg-white p-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-semibold">
              {getAvatarInitial(conversation.contact)}
            </div>
            <div>
              <h3 className="font-semibold text-base">{getDisplayName(conversation.contact)}</h3>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <span>{conversation.contact?.phone_number}</span>
                {conversation.assigned_to && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600">
                      Assigned
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status indicators */}
          <div className="flex items-center space-x-2">
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
                className="text-gray-600 hover:text-gray-900"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            )}
            {conversation.read_status === 'unread' && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                Unread
              </span>
            )}
            {conversation.status === 'closed' && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                Selesai
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Closed conversation notice */}
      {conversation.status === 'closed' && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-3 py-2">
          <p className="text-xs text-yellow-800 text-center">
            ⚠️ Chat sudah berakhir. Tidak bisa membalas lagi kecuali customer mengirim pesan baru.
          </p>
        </div>
      )}
      
      {/* Unassigned conversation notice */}
      {!conversation.assigned_to && conversation.status !== 'closed' && (
        <div className="bg-orange-50 border-b border-orange-200 px-3 py-2">
          <p className="text-xs text-orange-800 text-center">
            ⚠️ Silakan ambil obrolan ini terlebih dahulu sebelum membalas.
          </p>
        </div>
      )}

      {/* Messages Area with smooth scroll - Wrapped with relative positioning */}
      <div className="flex-1 relative min-h-0">
        <div 
          ref={messagesContainerRef}
          className="absolute inset-0 overflow-y-auto p-3 scroll-smooth"
          onScroll={handleScroll}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-2"></div>
                <p className="text-sm">Loading messages...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>No messages yet</p>
            </div>
          ) : (
            <>
              <MessagesList
                messages={messages}
                translations={translations}
                translating={translating}
                onTranslate={onTranslate}
                onReply={handleReply}
              />
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Back to Bottom Button - Fixed position relative to messages area */}
        <BackToBottomButton
          show={showBackToBottom}
          newMessageCount={newMessageCount}
          onClick={handleBackToBottomClick}
        />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t">
        {/* Reply Preview */}
        {replyingTo && (
          <div className="px-3 pt-3 pb-2 border-b bg-gray-50">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-blue-600">
                    Replying to {replyingTo.is_from_me 
                      ? (replyingTo.sent_by_user?.full_name || 'You')
                      : (replyingTo.contact?.name || 'Customer')
                    }
                  </span>
                </div>
                <p className="text-xs text-gray-600 truncate">
                  {replyingTo.content}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelReply}
                className="h-6 w-6 p-0 shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
        
        <InputBar
          value={messageInput}
          onChange={onMessageInputChange}
          onSend={onSendMessage}
          onQuickReplyClick={onQuickReplyClick}
          onFocus={onChatWindowClick}
          disabled={disabled || conversation.status === 'closed'}
          sending={sending}
        />
      </div>
    </div>
  )
}
