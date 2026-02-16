// Conversation History Component
'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, ChevronRight, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ConversationHistoryProps {
  contactId: string
  currentConversationId: string
  onSelectConversation?: (conversationId: string) => void
  onViewInModal?: (conversationId: string) => void
  userRole?: 'owner' | 'agent' | 'supervisor'
}

interface HistoryItem {
  id: string
  last_message: string
  last_message_at: string
  status: 'open' | 'closed'
  workflow_status: string
  message_count: number
}

export function ConversationHistory({
  contactId,
  currentConversationId,
  onSelectConversation,
  onViewInModal,
  userRole = 'agent'
}: ConversationHistoryProps) {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    loadHistory()
  }, [contactId])

  const loadHistory = async () => {
    try {
      setLoading(true)
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { data, error } = await supabase
        .from('conversations')
        .select('id, last_message, last_message_at, status, workflow_status, metadata')
        .eq('contact_id', contactId)
        .neq('id', currentConversationId)
        .order('last_message_at', { ascending: false })
        .limit(10)

      if (error) throw error

      // Map data and extract message_count from metadata
      const mappedData = (data || []).map((item: any) => ({
        id: item.id,
        last_message: item.last_message,
        last_message_at: item.last_message_at,
        status: item.status,
        workflow_status: item.workflow_status,
        message_count: item.metadata?.message_count || 0
      }))

      setHistory(mappedData)
    } catch (error) {
      console.error('Error loading conversation history:', error)
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string, workflowStatus: string) => {
    if (status === 'closed' || workflowStatus === 'resolved') {
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
          Resolved
        </span>
      )
    }
    if (workflowStatus === 'in_progress') {
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
          Assigned
        </span>
      )
    }
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">
        Open
      </span>
    )
  }

  const handleConversationClick = (conversationId: string, status: string, workflowStatus: string) => {
    // For agents: if conversation is closed/resolved, open in modal (read-only)
    // For owner/supervisor: can jump directly to conversation
    const isResolved = status === 'closed' || workflowStatus === 'resolved'
    
    if (userRole === 'agent' && isResolved) {
      // Agent viewing closed conversation - open in modal
      onViewInModal?.(conversationId)
    } else {
      // Owner/supervisor or open conversation - jump directly
      onSelectConversation?.(conversationId)
    }
  }

  const displayedHistory = showAll ? history : history.slice(0, 3)

  if (loading) {
    return (
      <div className="py-4 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mx-auto"></div>
        <p className="text-xs text-gray-500 mt-2">Loading history...</p>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="py-4 text-center">
        <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
        <p className="text-xs text-gray-500">No previous conversations</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {displayedHistory.map((item) => (
        <button
          key={item.id}
          onClick={() => handleConversationClick(item.id, item.status, item.workflow_status)}
          className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <MessageSquare className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <p className="text-xs text-gray-700 truncate font-medium">
                {item.last_message || 'No message'}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 shrink-0 ml-2" />
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-gray-500">
              <Clock className="h-3 w-3" />
              <span>{formatDate(item.last_message_at)}</span>
            </div>
            {getStatusBadge(item.status, item.workflow_status)}
          </div>

          {item.message_count > 0 && (
            <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
              <MessageSquare className="h-3 w-3" />
              <span>{item.message_count} messages</span>
            </div>
          )}
        </button>
      ))}

      {history.length > 3 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="w-full h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          {showAll ? 'Show Less' : `View All History (${history.length})`}
        </Button>
      )}
    </div>
  )
}
