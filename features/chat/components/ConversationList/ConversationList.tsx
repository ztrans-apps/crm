// Unified Conversation List - Works for both Owner and Agent
'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, MessageSquare, Filter, ArrowUpDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import { ConversationItem } from '../shared/ConversationItem'

type FilterType = 'inbox' | 'assigned' | 'resolved'
type SortType = 'newest' | 'oldest' | 'unread'

interface Conversation {
  id: string
  contact: {
    name: string | null
    phone_number: string
  }
  last_message: string | null
  last_message_at: string
  status: 'open' | 'closed'
  read_status: 'read' | 'unread'
  unread_count: number
  assigned_to: string | null
  workflow_status?: 'incoming' | 'waiting' | 'in_progress' | 'done'
  labels?: Array<{ id: string; name: string; color: string | null }>
}

interface UnifiedConversationListProps {
  conversations: Conversation[]
  selectedId: string | null
  onSelect: (id: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  loading?: boolean
  onPickConversation?: (conversationId: string) => void
  currentUserId?: string | null
  userRole: 'owner' | 'agent' | 'supervisor'
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  searchQuery,
  onSearchChange,
  loading = false,
  onPickConversation,
  currentUserId,
  userRole,
}: UnifiedConversationListProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('inbox')
  const [sortBy, setSortBy] = useState<SortType>('newest')
  const [advancedFilters, setAdvancedFilters] = useState({
    unrespondedChat: false,
    sessionOpen: false,
    sessionExpiring: false,
    sessionExpired: false,
    selectedDivision: '',
    selectedChannel: '',
    selectedTags: [] as string[],
    untagged: false,
  })

  // Filter conversations based on active filter
  const filteredConversations = conversations.filter(conv => {
    // Apply main filter
    if (activeFilter === 'inbox') {
      // For agents: show unassigned + assigned to me
      // For owners: show all open conversations
      if (userRole === 'agent') {
        return (conv.status === 'open' || conv.workflow_status !== 'done') && 
               (!conv.assigned_to || conv.assigned_to === currentUserId)
      } else {
        return conv.status === 'open' || conv.workflow_status !== 'done'
      }
    } else if (activeFilter === 'assigned') {
      // Show only conversations assigned to current user
      return conv.assigned_to === currentUserId
    } else if (activeFilter === 'resolved') {
      // Show closed/done conversations
      return conv.status === 'closed' || conv.workflow_status === 'done'
    }
    return true
  }).filter(conv => {
    // Apply advanced filters
    if (advancedFilters.unrespondedChat && conv.read_status === 'read') {
      return false
    }
    // Session filters would need backend data
    if (advancedFilters.sessionOpen || advancedFilters.sessionExpiring || advancedFilters.sessionExpired) {
      // Placeholder for session filtering
    }
    if (advancedFilters.selectedDivision && conv.assigned_to_user?.division !== advancedFilters.selectedDivision) {
      return false
    }
    if (advancedFilters.selectedChannel && conv.channel !== advancedFilters.selectedChannel) {
      return false
    }
    if (advancedFilters.selectedTags.length > 0) {
      const hasSelectedTag = conv.labels?.some(label => 
        advancedFilters.selectedTags.includes(label.id)
      )
      if (!hasSelectedTag) return false
    }
    if (advancedFilters.untagged && conv.labels && conv.labels.length > 0) {
      return false
    }
    return true
  })

  // Sort conversations
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    } else if (sortBy === 'oldest') {
      return new Date(a.last_message_at).getTime() - new Date(b.last_message_at).getTime()
    } else if (sortBy === 'unread') {
      // Unread first, then by newest
      if (a.unread_count > 0 && b.unread_count === 0) return -1
      if (a.unread_count === 0 && b.unread_count > 0) return 1
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    }
    return 0
  })

  // Calculate counts
  const counts = {
    inbox: conversations.filter(c => {
      if (userRole === 'agent') {
        return (c.status === 'open' || c.workflow_status !== 'done') && 
               (!c.assigned_to || c.assigned_to === currentUserId)
      }
      return c.status === 'open' || c.workflow_status !== 'done'
    }).length,
    assigned: conversations.filter(c => c.assigned_to === currentUserId).length,
    resolved: conversations.filter(c => c.status === 'closed' || c.workflow_status === 'done').length,
  }

  const activeFilterCount = 
    (advancedFilters.unrespondedChat ? 1 : 0) +
    (advancedFilters.sessionOpen ? 1 : 0) +
    (advancedFilters.sessionExpiring ? 1 : 0) +
    (advancedFilters.sessionExpired ? 1 : 0) +
    (advancedFilters.selectedDivision ? 1 : 0) +
    (advancedFilters.selectedChannel ? 1 : 0) +
    (advancedFilters.selectedTags.length) +
    (advancedFilters.untagged ? 1 : 0)

  // Get unique labels for filter dropdown
  const availableLabels = Array.from(
    new Map(
      conversations
        .flatMap(c => c.labels || [])
        .map(label => [label.id, label])
    ).values()
  )

  const resetFilters = () => {
    setAdvancedFilters({
      unrespondedChat: false,
      sessionOpen: false,
      sessionExpiring: false,
      sessionExpired: false,
      selectedDivision: '',
      selectedChannel: '',
      selectedTags: [],
      untagged: false,
    })
  }

  return (
    <div className="w-80 border-r bg-white flex flex-col h-full">
      {/* Header with search and filter tabs */}
      <div className="p-3 border-b bg-white">
        <h3 className="text-sm font-semibold mb-2.5">Obrolan</h3>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder="Cari obrolan..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded p-0.5 mb-3">
          <button
            onClick={() => setActiveFilter('inbox')}
            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1 ${
              activeFilter === 'inbox'
                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>Masuk</span>
            {counts.inbox > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] bg-blue-600 text-white text-[10px] px-1.5 rounded-full font-semibold leading-none">
                {counts.inbox}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveFilter('assigned')}
            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1 ${
              activeFilter === 'assigned'
                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>Saya</span>
            {counts.assigned > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] bg-gray-600 text-white text-[10px] px-1.5 rounded-full font-semibold leading-none">
                {counts.assigned}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveFilter('resolved')}
            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1 ${
              activeFilter === 'resolved'
                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>Selesai</span>
            {counts.resolved > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] bg-gray-400 text-white text-[10px] px-1.5 rounded-full font-semibold leading-none">
                {counts.resolved}
              </span>
            )}
          </button>
        </div>

        {/* Sort and Filter Controls */}
        <div className="flex items-center gap-2">
          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 h-8 text-xs">
                <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
                {sortBy === 'newest' && 'Terbaru'}
                {sortBy === 'oldest' && 'Terlama'}
                {sortBy === 'unread' && 'Belum Dibaca'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Urutkan</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortBy('newest')}>
                <div className="flex items-center justify-between w-full">
                  <span>Terbaru</span>
                  {sortBy === 'newest' && <span className="text-blue-600">✓</span>}
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('oldest')}>
                <div className="flex items-center justify-between w-full">
                  <span>Terlama</span>
                  {sortBy === 'oldest' && <span className="text-blue-600">✓</span>}
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('unread')}>
                <div className="flex items-center justify-between w-full">
                  <span>Belum Dibaca</span>
                  {sortBy === 'unread' && <span className="text-blue-600">✓</span>}
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Advanced Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-3 relative text-xs">
                Filter
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-blue-600 text-white text-[9px] rounded-full flex items-center justify-center font-semibold">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="flex items-center justify-between px-2 py-2">
                <DropdownMenuLabel className="p-0">Filter</DropdownMenuLabel>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
                  >
                    Reset filter
                  </Button>
                )}
              </div>
              <DropdownMenuSeparator />
              
              {/* Unresponded Chat */}
              <div className="px-2 py-2">
                <DropdownMenuCheckboxItem
                  checked={advancedFilters.unrespondedChat}
                  onCheckedChange={(checked) => 
                    setAdvancedFilters(prev => ({ ...prev, unrespondedChat: checked }))
                  }
                >
                  Unresponded chat
                </DropdownMenuCheckboxItem>
              </div>

              <DropdownMenuSeparator />
              
              {/* Session */}
              <div className="px-2 py-1">
                <div className="text-xs font-semibold text-gray-700 mb-1.5">Session</div>
                <div className="space-y-1">
                  <DropdownMenuCheckboxItem
                    checked={advancedFilters.sessionOpen}
                    onCheckedChange={(checked) => 
                      setAdvancedFilters(prev => ({ ...prev, sessionOpen: checked }))
                    }
                  >
                    Open
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={advancedFilters.sessionExpiring}
                    onCheckedChange={(checked) => 
                      setAdvancedFilters(prev => ({ ...prev, sessionExpiring: checked }))
                    }
                  >
                    Expiring
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={advancedFilters.sessionExpired}
                    onCheckedChange={(checked) => 
                      setAdvancedFilters(prev => ({ ...prev, sessionExpired: checked }))
                    }
                  >
                    Expired
                  </DropdownMenuCheckboxItem>
                </div>
              </div>

              <DropdownMenuSeparator />

              {/* Division */}
              <div className="px-2 py-2">
                <div className="text-xs font-semibold text-gray-700 mb-1.5">Division</div>
                <select
                  value={advancedFilters.selectedDivision}
                  onChange={(e) => 
                    setAdvancedFilters(prev => ({ ...prev, selectedDivision: e.target.value }))
                  }
                  className="w-full h-8 px-2 text-xs border rounded bg-white"
                >
                  <option value="">Select division</option>
                  <option value="sales">Sales</option>
                  <option value="support">Support</option>
                  <option value="marketing">Marketing</option>
                </select>
              </div>

              <DropdownMenuSeparator />

              {/* Channel */}
              <div className="px-2 py-2">
                <div className="text-xs font-semibold text-gray-700 mb-1.5">Channel</div>
                <select
                  value={advancedFilters.selectedChannel}
                  onChange={(e) => 
                    setAdvancedFilters(prev => ({ ...prev, selectedChannel: e.target.value }))
                  }
                  className="w-full h-8 px-2 text-xs border rounded bg-white"
                >
                  <option value="">Select channel</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="telegram">Telegram</option>
                  <option value="instagram">Instagram</option>
                </select>
              </div>

              <DropdownMenuSeparator />

              {/* Tags */}
              <div className="px-2 py-2">
                <div className="text-xs font-semibold text-gray-700 mb-1.5">Tags</div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {availableLabels.length > 0 ? (
                    availableLabels.map((label) => (
                      <DropdownMenuCheckboxItem
                        key={label.id}
                        checked={advancedFilters.selectedTags.includes(label.id)}
                        onCheckedChange={(checked) => {
                          setAdvancedFilters(prev => ({
                            ...prev,
                            selectedTags: checked
                              ? [...prev.selectedTags, label.id]
                              : prev.selectedTags.filter(id => id !== label.id)
                          }))
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {label.color && (
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: label.color }}
                            />
                          )}
                          <span>{label.name}</span>
                        </div>
                      </DropdownMenuCheckboxItem>
                    ))
                  ) : (
                    <div className="text-xs text-gray-500 py-2">No tags available</div>
                  )}
                </div>
                <DropdownMenuCheckboxItem
                  checked={advancedFilters.untagged}
                  onCheckedChange={(checked) => 
                    setAdvancedFilters(prev => ({ ...prev, untagged: checked }))
                  }
                  className="mt-1"
                >
                  Untagged
                </DropdownMenuCheckboxItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : sortedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">Tidak ada obrolan</p>
          </div>
        ) : (
          sortedConversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isSelected={selectedId === conv.id}
              onSelect={() => onSelect(conv.id)}
              onPick={onPickConversation ? () => onPickConversation(conv.id) : undefined}
              showPickButton={userRole === 'agent' && !conv.assigned_to && conv.status === 'open'}
            />
          ))
        )}
      </div>
    </div>
  )
}
