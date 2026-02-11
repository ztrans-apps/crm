// Message bubble component - WhatsApp Web style
'use client'

import { useState, memo } from 'react'
import type { MessageWithRelations } from '@/lib/types/chat'
import { Button } from '@/components/ui/button'
import { Languages, Check, CheckCheck, Clock, XCircle, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MediaPreview } from './MediaPreview'
import { AudioPlayer } from './AudioPlayer'
import { LocationMapWrapper } from './LocationMapWrapper'

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
  const [showMediaPreview, setShowMediaPreview] = useState(false)

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
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sending':
        return <Clock className="h-3 w-3 opacity-60" />
      case 'sent':
        return <Check className="h-3 w-3 opacity-70" />
      case 'delivered':
        return <CheckCheck className="h-3 w-3 opacity-70" />
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />
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
    <div className={`flex ${message.is_from_me ? 'justify-end' : 'justify-start'} ${showSender ? 'mb-2' : 'mb-0.5'} group`}>
      <div className={`flex flex-col ${message.is_from_me ? 'items-end' : 'items-start'} max-w-[65%]`}>
        {/* Sender name for incoming messages - only show for first message in group */}
        {!message.is_from_me && showSender && (
          <div className="px-2 mb-1">
            <span className="text-[11px] text-gray-600 font-medium">
              {message.contact?.name || message.contact?.phone_number || 'Customer'}
            </span>
          </div>
        )}

        {/* Agent name for outgoing messages - only show for first message in group */}
        {message.is_from_me && showSender && (
          <div className="px-2 mb-1">
            <span className="text-[11px] text-blue-600 font-medium">
              {message.sent_by_user?.full_name || 'Agent'}
            </span>
          </div>
        )}

        {/* Message bubble */}
        <div className="relative group/bubble">
          <div
            className={`rounded-lg px-2 py-1 shadow-sm relative ${
              message.is_from_me
                ? 'bg-[#d9fdd3] text-gray-900'
                : 'bg-white text-gray-900'
            }`}
            style={{ maxWidth: '450px', minWidth: '60px' }}
          >
            {/* Media content - image, video, document */}
            {message.media_url && message.media_type && (
              <div className="mb-1">
                {message.media_type === 'image' && (
                  <img
                    src={message.media_url}
                    alt={message.media_filename || 'Image'}
                    className={`rounded max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity ${
                      message.media_filename?.includes('sticker') ? 'bg-transparent' : ''
                    }`}
                    style={{ 
                      maxHeight: '300px', 
                      objectFit: 'contain',
                      // Stickers are usually smaller
                      maxWidth: message.media_filename?.includes('sticker') ? '200px' : '100%'
                    }}
                    onClick={() => setShowMediaPreview(true)}
                  />
                )}
                
                {message.media_type === 'video' && (
                  <div 
                    className="relative cursor-pointer group"
                    onClick={() => setShowMediaPreview(true)}
                  >
                    <video
                      src={message.media_url}
                      className="rounded max-w-full h-auto"
                      style={{ maxHeight: '300px' }}
                    >
                      Your browser does not support video playback.
                    </video>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors rounded">
                      <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                        <div className="w-0 h-0 border-l-[20px] border-l-gray-800 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent ml-1"></div>
                      </div>
                    </div>
                  </div>
                )}
                
                {message.media_type === 'audio' && (
                  <AudioPlayer 
                    src={message.media_url} 
                    isFromMe={message.is_from_me}
                  />
                )}
                
                {(message.media_type === 'document' || message.media_type === 'vcard') && (
                  <a
                    href={message.media_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                  >
                    <span className="text-2xl">📄</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {message.media_filename || 'Document'}
                      </p>
                      {message.media_size && (
                        <p className="text-[10px] text-gray-500">
                          {(message.media_size / 1024).toFixed(1)} KB
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-blue-600">↓</span>
                  </a>
                )}
                
                {message.media_type === 'location' && (() => {
                  // Parse location data
                  let latitude = 0
                  let longitude = 0
                  let address = message.media_filename || undefined
                  
                  // Try to parse from content (format: "lat,lng")
                  if (message.content && message.content.includes(',')) {
                    const parts = message.content.split(',')
                    latitude = parseFloat(parts[0]) || 0
                    longitude = parseFloat(parts[1]) || 0
                  }
                  // Fallback: try to parse from media_url if it's a Google Maps URL
                  else if (message.media_url && message.media_url.includes('q=')) {
                    const match = message.media_url.match(/q=([-\d.]+),([-\d.]+)/)
                    if (match) {
                      latitude = parseFloat(match[1]) || 0
                      longitude = parseFloat(match[2]) || 0
                    }
                  }
                  
                  // Only render if we have valid coordinates
                  if (latitude !== 0 && longitude !== 0) {
                    return (
                      <LocationMapWrapper
                        latitude={latitude}
                        longitude={longitude}
                        address={address}
                        isFromMe={message.is_from_me}
                      />
                    )
                  }
                  
                  return null
                })()}
              </div>
            )}

            {/* Message content with word wrap */}
            {message.content && (
              <p className="text-[13px] leading-[1.4] break-words whitespace-pre-wrap pr-12">
                {message.content}
              </p>
            )}

            {/* Add spacing for time if there's no text content but has media */}
            {!message.content && message.media_url && (
              <div className="h-4"></div>
            )}

            {/* Time and status in bottom right corner */}
            <div className="absolute bottom-1 right-2 flex items-center gap-1">
              <span className="text-[10px] text-gray-500">
                {formatTime(message.created_at)}
              </span>
              {message.is_from_me && message.status && (
                <span className="text-gray-500 flex items-center">
                  {getStatusIcon(message.status)}
                </span>
              )}
            </div>

            {/* Translation */}
            {showTranslation && translation && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Translation:</p>
                <p className="text-[13px] leading-[1.4] break-words whitespace-pre-wrap">
                  {translation}
                </p>
              </div>
            )}
          </div>

          {/* Message actions menu */}
          <div className={`absolute top-0 ${message.is_from_me ? '-left-8' : '-right-8'} opacity-0 group-hover/bubble:opacity-100 transition-opacity`}>
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

      {/* Media Preview Modal */}
      {message.media_url && message.media_type && (
        <MediaPreview
          isOpen={showMediaPreview}
          onClose={() => setShowMediaPreview(false)}
          mediaUrl={message.media_url}
          mediaType={message.media_type}
          mediaFilename={message.media_filename || undefined}
        />
      )}
    </div>
  )
}

// Memoize to prevent re-render when parent updates
export default memo(MessageBubble)
