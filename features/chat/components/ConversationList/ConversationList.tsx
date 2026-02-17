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
    workflowStatuses: [] as string[],
    assignedAgents: [] as string[],
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
    
    // Unresponded chat: no first_response_at (agent hasn't replied yet)
    if (advancedFilters.unrespondedChat && conv.first_response_at) {
      return false
    }
    
    // Workflow status filter
    if (advancedFilters.workflowStatuses.length > 0) {
      if (!advancedFilters.workflowStatuses.includes(conv.workflow_status || 'incoming')) {
        return false
      }
    }
    
    // Assigned agent filter
    if (advancedFilters.assignedAgents.length > 0) {
      if (!conv.assigned_to || !advancedFilters.assignedAgents.includes(conv.assigned_to)) {
        return false
      }
    }
    
    // Tags filter
    if (advancedFilters.selectedTags.length > 0) {
      const hasSelectedTag = conv.labels?.some(labelItem => {
        const label = labelItem.label || labelItem
        return advancedFilters.selectedTags.includes(label.id)
      })
      if (!hasSelectedTag) return false
    }
    
    // Untagged filter
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
    advancedFilters.workflowStatuses.length +
    advancedFilters.assignedAgents.length +
    advancedFilters.selectedTags.length +
    (advancedFilters.untagged ? 1 : 0)

  // Get unique agents for filter dropdown
  const availableAgents = Array.from(
    new Map(
      conversations
        .filter(c => c.assigned_agent)
        .map(c => [c.assigned_agent.id, c.assigned_agent])
    ).values()
  )

  // Get unique labels for filter dropdown
  const availableLabels = Array.from(
    new Map(
      conversations
        .flatMap(c => c.labels || [])
        .map(labelItem => {
          const label = labelItem.label || labelItem
          return [label.id, label]
        })
    ).values()
  )

  const resetFilters = () => {
    setAdvancedFilters({
      unrespondedChat: false,
      workflowStatuses: [],
      assignedAgents: [],
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
                  Belum dibalas agent
                </DropdownMenuCheckboxItem>
              </div>

              <DropdownMenuSeparator />
              
              {/* Workflow Status */}
              <div className="px-2 py-1">
                <div className="text-xs font-semibold text-gray-700 mb-1.5">Status Workflow</div>
                <div className="space-y-1">
                  <DropdownMenuCheckboxItem
                    checked={advancedFilters.workflowStatuses.includes('incoming')}
                    onCheckedChange={(checked) => {
                      setAdvancedFilters(prev => ({
                        ...prev,
                        workflowStatuses: checked
                          ? [...prev.workflowStatuses, 'incoming']
                          : prev.workflowStatuses.filter(s => s !== 'incoming')
                      }))
                    }}
                  >
                    Masuk
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={advancedFilters.workflowStatuses.includes('waiting')}
                    onCheckedChange={(checked) => {
                      setAdvancedFilters(prev => ({
                        ...prev,
                        workflowStatuses: checked
                          ? [...prev.workflowStatuses, 'waiting']
                          : prev.workflowStatuses.filter(s => s !== 'waiting')
                      }))
                    }}
                  >
                    Menunggu
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={advancedFilters.workflowStatuses.includes('in_progress')}
                    onCheckedChange={(checked) => {
                      setAdvancedFilters(prev => ({
                        ...prev,
                        workflowStatuses: checked
                          ? [...prev.workflowStatuses, 'in_progress']
                          : prev.workflowStatuses.filter(s => s !== 'in_progress')
                      }))
                    }}
                  >
                    Sedang Dikerjakan
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={advancedFilters.workflowStatuses.includes('done')}
                    onCheckedChange={(checked) => {
                      setAdvancedFilters(prev => ({
                        ...prev,
                        workflowStatuses: checked
                          ? [...prev.workflowStatuses, 'done']
                          : prev.workflowStatuses.filter(s => s !== 'done')
                      }))
                    }}
                  >
                    Selesai
                  </DropdownMenuCheckboxItem>
                </div>
              </div>

              <DropdownMenuSeparator />

              {/* Assigned Agent */}
              <div className="px-2 py-2">
                <div className="text-xs font-semibold text-gray-700 mb-1.5">Agent</div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {availableAgents.length > 0 ? (
                    availableAgents.map((agent) => (
                      <DropdownMenuCheckboxItem
                        key={agent.id}
                        checked={advancedFilters.assignedAgents.includes(agent.id)}
                        onCheckedChange={(checked) => {
                          setAdvancedFilters(prev => ({
                            ...prev,
                            assignedAgents: checked
                              ? [...prev.assignedAgents, agent.id]
                              : prev.assignedAgents.filter(id => id !== agent.id)
                          }))
                        }}
                      >
                        {agent.full_name || agent.email}
                      </DropdownMenuCheckboxItem>
                    ))
                  ) : (
                    <div className="text-xs text-gray-500 py-2">No agents assigned</div>
                  )}
                </div>
              </div>

              <DropdownMenuSeparator />

              {/* Tags */}
              <div className="px-2 py-2">
                <div className="text-xs font-semibold text-gray-700 mb-1.5">Label</div>
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
                              className="w-3 h-2 rounded-sm" 
                              style={{ backgroundColor: label.color }}
                            />
                          )}
                          <span>{label.name}</span>
                        </div>
                      </DropdownMenuCheckboxItem>
                    ))
                  ) : (
                    <div className="text-xs text-gray-500 py-2">Tidak ada label</div>
                  )}
                </div>
                <DropdownMenuCheckboxItem
                  checked={advancedFilters.untagged}
                  onCheckedChange={(checked) => 
                    setAdvancedFilters(prev => ({ ...prev, untagged: checked }))
                  }
                  className="mt-1"
                >
                  Tanpa label
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
          sortedConversations.map((conv) => {
            const isUnassigned = !conv.assigned_to
            const canPick = userRole === 'agent' && isUnassigned && conv.status === 'open'
            
            return (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isSelected={selectedId === conv.id}
                onSelect={() => onSelect(conv.id)}
                onPick={onPickConversation ? () => onPickConversation(conv.id) : undefined}
                showPickButton={canPick}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
