// Handover History Component - Show handover logs for a conversation
'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, Clock, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

interface HandoverHistoryProps {
  conversationId: string
}

interface HandoverLog {
  id: string
  from_agent: {
    id: string
    full_name: string
    email: string
  }
  to_agent: {
    id: string
    full_name: string
    email: string
  }
  reason: string | null
  handover_at: string
}

export function HandoverHistory({ conversationId }: HandoverHistoryProps) {
  const [handovers, setHandovers] = useState<HandoverLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHandoverHistory()
  }, [conversationId])

  const loadHandoverHistory = async () => {
    try {
      setLoading(true)
      const { conversationService } = await import('@/features/chat/services')
      const data = await conversationService.getConversationHandoverHistory(conversationId)
      setHandovers(data || [])
    } catch (error) {
      console.error('Error loading handover history:', error)
      setHandovers([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-vx-purple"></div>
      </div>
    )
  }

  if (handovers.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-vx-text-muted">Belum ada riwayat handover</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {handovers.map((handover) => (
        <div
          key={handover.id}
          className="p-3 bg-vx-surface border border-vx-border rounded-lg hover:border-vx-purple/30 transition-colors"
        >
          {/* From -> To */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">
                  {handover.from_agent.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-xs font-medium text-vx-text-secondary truncate">
                {handover.from_agent.full_name}
              </span>
            </div>

            <ArrowRight className="h-3.5 w-3.5 text-vx-text-muted shrink-0" />

            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <div className="w-5 h-5 rounded-full bg-vx-teal/10 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-semibold text-vx-teal">
                  {handover.to_agent.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-xs font-medium text-vx-text-secondary truncate">
                {handover.to_agent.full_name}
              </span>
            </div>
          </div>

          {/* Reason */}
          {handover.reason && (
            <p className="text-xs text-vx-text-secondary mb-2 pl-6">
              "{handover.reason}"
            </p>
          )}

          {/* Time */}
          <div className="flex items-center gap-1 text-[10px] text-vx-text-muted pl-6">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(handover.handover_at), {
              addSuffix: true,
              locale: localeId,
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
