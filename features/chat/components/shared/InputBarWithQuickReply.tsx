'use client'

// Enhanced Input Bar with Quick Reply Support
// Detects "/" and shows quick reply dropdown

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Smile, Send, Zap, Plus, X, MessageSquare } from 'lucide-react'
import { QuickReplyDropdown } from './QuickReplyDropdown'
import type { MediaAttachment } from '@/lib/types/chat'

interface InputBarWithQuickReplyProps {
  value: string
  onChange: (value: string) => void
  onSend: (media?: MediaAttachment) => void
  onQuickReplyClick?: () => void
  onFocus?: () => void
  disabled?: boolean
  sending?: boolean
  replyingTo?: any | null
  onCancelReply?: () => void
}

export function InputBarWithQuickReply({
  value,
  onChange,
  onSend,
  onQuickReplyClick,
  onFocus,
  disabled = false,
  sending = false,
  replyingTo = null,
  onCancelReply,
}: InputBarWithQuickReplyProps) {
  const [showQuickReplyDropdown, setShowQuickReplyDropdown] = useState(false)
  const [quickReplySearch, setQuickReplySearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Detect "/" for quick reply
  useEffect(() => {
    // Check if value starts with "/" or has "/" after space
    const words = value.split(' ')
    const lastWord = words[words.length - 1]
    
    if (lastWord.startsWith('/')) {
      setShowQuickReplyDropdown(true)
      setQuickReplySearch(lastWord.slice(1)) // Remove "/"
    } else {
      setShowQuickReplyDropdown(false)
      setQuickReplySearch('')
    }
  }, [value])

  function handleQuickReplySelect(content: string) {
    // Replace the "/search" part with the quick reply content
    const words = value.split(' ')
    words[words.length - 1] = content
    onChange(words.join(' '))
    setShowQuickReplyDropdown(false)
    inputRef.current?.focus()
  }

  function handleSend() {
    if (!value.trim() || disabled || sending) return
    onSend()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Don't handle Enter if quick reply dropdown is open
    if (showQuickReplyDropdown) {
      return // Let QuickReplyDropdown handle it
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div ref={containerRef} className="bg-white p-2 relative">
      {/* Reply preview */}
      {replyingTo && (
        <div className="mb-2 p-2 bg-blue-50 border-l-4 border-blue-500 rounded flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="h-3 w-3 text-blue-600" />
              <p className="text-xs font-medium text-blue-700">
                Replying to {replyingTo.is_from_me ? 'yourself' : (replyingTo.contact?.name || 'Customer')}
              </p>
            </div>
            <p className="text-xs text-gray-600 truncate">
              {replyingTo.content || (replyingTo.media_type ? `[${replyingTo.media_type}]` : 'Message')}
            </p>
          </div>
          {onCancelReply && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancelReply}
              className="h-6 w-6 p-0 ml-2"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      {/* Quick Reply Dropdown */}
      <QuickReplyDropdown
        show={showQuickReplyDropdown}
        searchQuery={quickReplySearch}
        onSelect={handleQuickReplySelect}
        onClose={() => setShowQuickReplyDropdown(false)}
      />

      {/* Input area */}
      <div className="flex items-center space-x-2">
        {/* Quick Reply Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            onChange(value + (value ? ' /' : '/'))
            inputRef.current?.focus()
          }}
          className="text-gray-500 hover:text-gray-700 h-9 w-9"
          type="button"
          title="Quick Reply (type /)"
        >
          <Zap className="h-5 w-5" />
        </Button>

        {/* Input field */}
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            placeholder="Type a message or / for quick replies..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={onFocus}
            disabled={disabled || sending}
            className="h-9 pr-10"
          />
          {value && (
            <button
              onClick={() => onChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!value.trim() || disabled || sending}
          className="h-9 w-9 p-0"
          size="icon"
        >
          {sending ? (
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Hint */}
      {!value && (
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
          <Zap className="h-3 w-3" />
          <span>Tip: Type "/" to use quick replies</span>
        </div>
      )}
    </div>
  )
}
