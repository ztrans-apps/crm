// Messages list component - Memoized to prevent re-render on input change
'use client'

import { memo } from 'react'
import type { MessageWithRelations } from '@/lib/types/chat'
import { MessageBubble, DateSeparator } from './index'

interface MessagesListProps {
  messages: MessageWithRelations[]
  translations: Record<string, string>
  translating: Record<string, boolean>
  onTranslate: (messageId: string) => void
  onReply: (message: MessageWithRelations) => void
}

function MessagesList({
  messages,
  translations,
  translating,
  onTranslate,
  onReply,
}: MessagesListProps) {
  return (
    <>
      {messages.map((msg, index) => {
        const prevMsg = index > 0 ? messages[index - 1] : null
        
        // Check if we need a date separator
        const showDateSeparator = !prevMsg || 
          new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()
        
        // Message grouping logic - FIXED to check sender_id for agent messages
        const isSameSender = prevMsg && (
          prevMsg.is_from_me === msg.is_from_me &&
          // For agent messages, also check if same sender_id
          (!msg.is_from_me || prevMsg.sender_id === msg.sender_id)
        )
        
        const isWithin5Minutes = prevMsg && 
          (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) < 5 * 60 * 1000
        
        const isGrouped = isSameSender && isWithin5Minutes
        const showAvatar = !isGrouped || !prevMsg
        const showSender = !isGrouped || !prevMsg
        
        return (
          <div key={msg.id}>
            {showDateSeparator && (
              <DateSeparator date={new Date(msg.created_at)} />
            )}
            <MessageBubble
              message={msg}
              translation={translations[msg.id]}
              onTranslate={!msg.is_from_me ? () => onTranslate(msg.id) : undefined}
              translating={translating[msg.id]}
              showAvatar={showAvatar}
              showSender={showSender}
              onReply={onReply}
            />
          </div>
        )
      })}
    </>
  )
}

// Memoize to prevent re-render when parent updates
export default memo(MessagesList, (prevProps, nextProps) => {
  // Only re-render if messages, translations, or translating changed
  return (
    prevProps.messages === nextProps.messages &&
    prevProps.translations === nextProps.translations &&
    prevProps.translating === nextProps.translating
  )
})
