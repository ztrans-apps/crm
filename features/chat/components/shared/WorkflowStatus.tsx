// Workflow Status Manager Component for Agent - Compact Version
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Inbox, 
  Clock, 
  PlayCircle, 
  CheckCircle2,
} from 'lucide-react'
import { updateWorkflowStatus } from '@/lib/api/workflow'
import type { WorkflowStatus } from '@/lib/types/chat'

interface WorkflowStatusManagerProps {
  conversationId: string
  currentStatus: WorkflowStatus
  onStatusChanged: () => void
}

export function WorkflowStatusManager({
  conversationId,
  currentStatus,
  onStatusChanged,
}: WorkflowStatusManagerProps) {
  const [updating, setUpdating] = useState(false)

  const statuses: { value: WorkflowStatus; label: string; icon: any; color: string }[] = [
    { value: 'incoming', label: 'Masuk', icon: Inbox, color: 'bg-blue-500' },
    { value: 'waiting', label: 'Menunggu', icon: Clock, color: 'bg-yellow-500' },
    { value: 'in_progress', label: 'Progress', icon: PlayCircle, color: 'bg-green-500' },
    { value: 'done', label: 'Selesai', icon: CheckCircle2, color: 'bg-gray-500' },
  ]

  const handleStatusChange = async (newStatus: WorkflowStatus) => {
    if (newStatus === currentStatus || updating) return

    // Show confirmation for "done" status
    if (newStatus === 'done') {
      const confirmed = confirm(
        '⚠️ Yakin ingin menyelesaikan chat ini?\n\n' +
        'Chat akan ditutup dan tidak bisa dibalas lagi.'
      )
      if (!confirmed) return
    }

    try {
      setUpdating(true)
      await updateWorkflowStatus(conversationId, newStatus)
      onStatusChanged()
    } catch (error: any) {
      console.error('Error changing status:', error)
      alert('Gagal mengubah status: ' + error.message)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-[10px] text-gray-500 block">Workflow Status</label>
      
      {/* Compact Status Buttons */}
      <div className="grid grid-cols-2 gap-1.5">
        {statuses.map((status) => {
          const Icon = status.icon
          const isActive = status.value === currentStatus
          return (
            <button
              key={status.value}
              type="button"
              onClick={() => handleStatusChange(status.value)}
              disabled={updating || isActive}
              className={`
                flex items-center justify-center space-x-1 px-2 py-1.5 rounded text-[10px] font-medium
                transition-all duration-200
                ${isActive 
                  ? status.color + ' text-white shadow-sm' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
                ${updating || isActive ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
              `}
            >
              <Icon className="h-3 w-3" />
              <span>{status.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
