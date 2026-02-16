// Chat window component with messages and input
'use client'

import { useRef, useState, useCallback } from 'react'
import { MessageSquare, RefreshCw } from 'lucide-react'
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
  onSendMessage: (media?: MediaAttachment, replyTo?: any) => void
  onQuickReplyClick?: () => void
  onRefresh?: () => void
  onChatWindowClick?: () => void // Callback when user clicks in chat window
  translations: Record<string, string>
  onTranslate: (messageId: string) => void
  translating: Record<string, boolean>
  sending: boolean
  loading: boolean
  loadingMore?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
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
  loadingMore = false,
  hasMore = false,
  onLoadMore,
  disabled = false,
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [replyingTo, setReplyingTo] = useState<MessageWithRelations | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [droppedFile, setDroppedFile] = useState<File | null>(null)
  const dragCounterRef = useRef(0)

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

  // Handle drag and drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounterRef.current = 0

    if (disabled || conversation?.status === 'closed') {
      return
    }

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0] // Only take first file
      setDroppedFile(file) // Set file to show in InputBar preview
    }
  }, [disabled, conversation])

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

  // Wrapper for send message with reply context
  const handleSendWithReply = useCallback((media?: MediaAttachment) => {
    onSendMessage(media, replyingTo)
    setReplyingTo(null) // Clear reply after sending
  }, [onSendMessage, replyingTo])

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
      className="flex-1 flex flex-col bg-gray-50 relative"
      onClick={onChatWindowClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag and Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-blue-500/10 backdrop-blur-sm flex items-center justify-center border-4 border-dashed border-blue-500">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop file here</h3>
            <p className="text-sm text-gray-500">Release to send the file</p>
          </div>
        </div>
      )}
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
            ⚠️ Chat sudah berakhir. Tidak bisa membalas lagi.
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
              {/* Load More Button */}
              {hasMore && onLoadMore && (
                <div className="flex justify-center mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onLoadMore}
                    disabled={loadingMore}
                    className="text-xs"
                  >
                    {loadingMore ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More Messages'
                    )}
                  </Button>
                </div>
              )}
              
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
        <InputBar
          value={messageInput}
          onChange={onMessageInputChange}
          onSend={handleSendWithReply}
          onQuickReplyClick={onQuickReplyClick}
          onFocus={onChatWindowClick}
          disabled={disabled || conversation.status === 'closed'}
          sending={sending}
          replyingTo={replyingTo}
          onCancelReply={handleCancelReply}
          conversation={conversation}
          droppedFile={droppedFile}
          onDroppedFileChange={setDroppedFile}
        />
      </div>
    </div>
  )
}
