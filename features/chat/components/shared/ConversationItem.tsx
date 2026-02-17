// Reusable Conversation Item Component
'use client'

import { Button } from '@/components/ui/button'
import { UserPlus } from 'lucide-react'

interface ConversationItemProps {
  conversation: any
  isSelected: boolean
  onSelect: () => void
  onPick?: () => void
  showPickButton?: boolean
}

export function ConversationItem({
  conversation,
  isSelected,
  onSelect,
  onPick,
  showPickButton = false,
}: ConversationItemProps) {
  const isUnread = conversation.unread_count > 0
  const isUnassigned = !conversation.assigned_to && conversation.status === 'open'
  const isContactSaved = conversation.contact?.name && conversation.contact.name.trim() !== ''

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getInitial = (name: string | null | undefined, phone: string | null | undefined) => {
    if (name && name.length > 0) return name.charAt(0).toUpperCase()
    if (phone && phone.length >= 2) return phone.charAt(phone.length - 2)
    return '?'
  }

  const getDisplayName = () => {
    if (conversation.contact?.name && conversation.contact.name.trim() !== '') {
      return conversation.contact.name
    }
    return conversation.contact?.phone_number || 'Unknown'
  }

  return (
    <div
      className={`p-3 border-b transition-colors cursor-pointer ${
        isSelected
          ? 'bg-blue-100 border-l-4 border-l-blue-600'
          : isUnread
          ? 'bg-blue-50/40 hover:bg-blue-50/60'
          : 'hover:bg-gray-50'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start space-x-3">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
            isUnread ? 'bg-green-600' : 'bg-green-500'
          }`}>
            {getInitial(conversation.contact?.name, conversation.contact?.phone_number)}
          </div>
          {isUnread && conversation.unread_count > 0 && (
            <div className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1.5 bg-red-500 rounded-full flex items-center justify-center shadow-md">
              <span className="text-white text-[10px] font-bold leading-none">
                {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <h3 className={`text-sm truncate ${
                isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'
              }`}>
                {getDisplayName()}
              </h3>
              {!isContactSaved && (
                <span 
                  className="shrink-0 w-2 h-2 rounded-full bg-orange-500" 
                  title="Kontak belum disimpan"
                />
              )}
            </div>
            <span className={`text-xs shrink-0 ml-2 ${
              isUnread ? 'text-blue-600 font-medium' : 'text-gray-500'
            }`}>
              {formatTime(conversation.last_message_at)}
            </span>
          </div>

          {/* Agent info if assigned */}
          {conversation.assigned_to_user && (
            <div className="text-[10px] text-blue-600 mb-0.5 truncate">
              Agent: {conversation.assigned_to_user.full_name || conversation.assigned_to_user.email}
            </div>
          )}

          <p className={`text-xs truncate ${
            isUnread ? 'text-gray-900 font-medium' : 'text-gray-600'
          }`}>
            {conversation.last_message || 'No messages'}
          </p>

          {/* Labels/Tags - Small rectangles with hover tooltip */}
          {conversation.labels && conversation.labels.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              {conversation.labels.slice(0, 3).map((labelItem: any) => {
                // Handle nested structure: labelItem.label contains the actual label data
                const label = labelItem.label || labelItem
                return (
                  <div
                    key={labelItem.id}
                    className="w-3 h-2 rounded-sm relative group cursor-default"
                    style={{
                      backgroundColor: label.color || '#9ca3af',
                    }}
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-[10px] rounded whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-10">
                      {label.name}
                    </div>
                  </div>
                )
              })}
              {conversation.labels.length > 3 && (
                <span className="text-[9px] text-gray-400 ml-0.5">
                  +{conversation.labels.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Pick button for unassigned chats */}
          {isUnassigned && showPickButton && onPick && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onPick()
              }}
              className="mt-2 w-full h-7 bg-green-600 hover:bg-green-700 text-white text-xs"
            >
              <UserPlus className="h-3 w-3 mr-1" />
              Ambil obrolan
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
