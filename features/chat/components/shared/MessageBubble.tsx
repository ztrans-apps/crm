// Message bubble component - Clean design inspired by modern chat UI
'use client'

import { useState } from 'react'
import type { MessageWithRelations } from '@/lib/types/chat'
import { Button } from '@/components/ui/button'
import { Languages, Check, CheckCheck, Clock, XCircle, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MessageBubbleProps {
  message: MessageWithRelations
  translation?: string
  onTranslate?: () => void
  translating?: boolean
  showAvatar?: boolean
  showSender?: boolean
  onReply?: (message: MessageWithRelations) => void
}

export function MessageBubble({ 
  message, 
  translation, 
  onTranslate, 
  translating,
  showAvatar = true,
  showSender = true,
  onReply
}: MessageBubbleProps) {
  const [showTranslation, setShowTranslation] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleTranslateClick = () => {
    if (!translation && onTranslate) {
      onTranslate()
    }
    setShowTranslation(!showTranslation)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      setShowMenu(false)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleReply = () => {
    if (onReply) {
      onReply(message)
    }
    setShowMenu(false)
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    }
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sending':
        return <Clock className="h-3 w-3 opacity-70" />
      case 'sent':
        return <Check className="h-3 w-3 opacity-90" />
      case 'delivered':
        return <CheckCheck className="h-3 w-3 opacity-90" />
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-400" />
      case 'failed':
        return <XCircle className="h-3 w-3 text-red-400" />
      default:
        return null
    }
  }

  const getAvatarInitial = () => {
    const name = message.contact?.name
    if (name && name.trim()) {
      return name.charAt(0).toUpperCase()
    }
    return message.contact?.phone_number?.replace(/\D/g, '').charAt(0) || 'C'
  }

  return (
    <div className={`flex ${message.is_from_me ? 'justify-end' : 'justify-start'} mb-1 group`}>
      {/* Avatar for incoming messages */}
      {!message.is_from_me && (
        <div className="flex flex-col items-center mr-2">
          {showAvatar ? (
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {getAvatarInitial()}
            </div>
          ) : (
            <div className="w-8 h-8"></div>
          )}
        </div>
      )}

      <div className="flex flex-col max-w-[65%]">
        {/* Sender name and timestamp */}
        {showSender && (
          <div className={`flex items-center gap-2 mb-1 px-1 ${message.is_from_me ? 'justify-end' : 'justify-start'}`}>
            <span className="text-xs font-medium text-gray-700">
              {message.is_from_me 
                ? (message.sent_by_user?.full_name || 'You')
                : (message.contact?.name || message.contact?.phone_number || 'Customer')
              }
            </span>
            <span className="text-xs text-gray-500">
              {formatTime(message.created_at)}
            </span>
          </div>
        )}

        <div className={`relative ${message.is_from_me ? 'self-end' : 'self-start'}`}>
          {/* Message bubble */}
          <div
            className={`rounded-lg px-3 py-2 shadow-sm ${
              message.is_from_me
                ? 'bg-blue-100 text-gray-900'
                : 'bg-white text-gray-900 border border-gray-200'
            }`}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

            {/* Translation */}
            {showTranslation && translation && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Translation:</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{translation}</p>
              </div>
            )}

            {/* Status icon for outgoing messages */}
            {message.is_from_me && message.status && !showSender && (
              <div className="flex items-center justify-end mt-1">
                <span className="text-gray-500">
                  {getStatusIcon(message.status)}
                </span>
              </div>
            )}
          </div>

          {/* Message actions menu */}
          <div className={`absolute top-0 ${message.is_from_me ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-opacity`}>
            <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 rounded-full hover:bg-gray-100"
                >
                  <MoreVertical className="h-3.5 w-3.5 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={message.is_from_me ? 'end' : 'start'} className="w-48">
                {!message.is_from_me && onTranslate && (
                  <DropdownMenuItem onClick={handleTranslateClick} disabled={translating}>
                    <Languages className="h-4 w-4 mr-2" />
                    {translating ? 'Translating...' : translation ? 'Show translation' : 'Translate'}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleCopy}>
                  <span className="mr-2">📋</span>
                  {copied ? 'Copied!' : 'Copy'}
                </DropdownMenuItem>
                {onReply && (
                  <DropdownMenuItem onClick={handleReply}>
                    <span className="mr-2">↩️</span>
                    Reply
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  )
}
