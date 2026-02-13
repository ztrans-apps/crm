// Workflow Status Manager Component for Agent - Dropdown Version
'use client'

import { useState } from 'react'
import { 
  Inbox, 
  Clock, 
  PlayCircle, 
  CheckCircle2,
  ChevronDown,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateWorkflowStatus } from '@/lib/api/workflow'
import type { WorkflowStatus } from '@/lib/types/chat'

interface WorkflowStatusManagerProps {
  conversationId: string
  currentStatus: WorkflowStatus
  onStatusChanged: () => void
  conversation?: any
  userRole?: 'owner' | 'agent' | 'supervisor'
  currentUserId?: string | null
}

export function WorkflowStatusManager({
  conversationId,
  currentStatus,
  onStatusChanged,
  conversation,
  userRole,
  currentUserId,
}: WorkflowStatusManagerProps) {
  const [updating, setUpdating] = useState(false)

  const statuses: { value: WorkflowStatus; label: string; icon: any; color: string }[] = [
    { value: 'incoming', label: 'Masuk', icon: Inbox, color: 'text-blue-600' },
    { value: 'waiting', label: 'Menunggu', icon: Clock, color: 'text-yellow-600' },
    { value: 'in_progress', label: 'Progress', icon: PlayCircle, color: 'text-green-600' },
    { value: 'done', label: 'Selesai', icon: CheckCircle2, color: 'text-gray-600' },
  ]

  const handleStatusChange = async (newStatus: WorkflowStatus) => {
    if (newStatus === currentStatus || updating) return

    // Prevent rollback from "done" status
    if (currentStatus === 'done') {
      alert('⚠️ Chat sudah selesai dan tidak bisa diubah lagi!')
      return
    }

    // Check if agent needs to pick conversation first
    if (userRole === 'agent' && conversation && !conversation.assigned_to) {
      alert('⚠️ Silakan ambil obrolan terlebih dahulu sebelum mengubah status!')
      return
    }

    // Check if agent is assigned to this conversation
    if (userRole === 'agent' && conversation && conversation.assigned_to !== currentUserId) {
      alert('⚠️ Anda tidak memiliki akses untuk mengubah status obrolan ini!')
      return
    }

    // Show confirmation for "done" status
    if (newStatus === 'done') {
      const confirmed = confirm(
        '⚠️ Yakin ingin menyelesaikan chat ini?\n\n' +
        'Chat akan ditandai selesai dan status tidak bisa diubah lagi.'
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

  // Check if dropdown should be disabled for agent
  const isDisabledForAgent = userRole === 'agent' && conversation && !conversation.assigned_to
  
  // Check if status is done (cannot be changed)
  const isStatusDone = currentStatus === 'done'
  
  const isDisabled = updating || isDisabledForAgent || isStatusDone

  const currentStatusData = statuses.find(s => s.value === currentStatus)
  const CurrentIcon = currentStatusData?.icon || Inbox

  return (
    <div className="space-y-2">
      <label className="text-[10px] text-gray-500 block">Workflow Status</label>
      
      {/* Warning message for agent */}
      {isDisabledForAgent && (
        <div className="text-[10px] text-orange-600 bg-orange-50 px-2 py-1 rounded">
          Ambil obrolan terlebih dahulu
        </div>
      )}
      
      {/* Warning message for done status */}
      {isStatusDone && (
        <div className="text-[10px] text-gray-600 bg-gray-50 px-2 py-1 rounded flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Chat sudah selesai
        </div>
      )}
      
      {/* Dropdown Select */}
      <Select
        value={currentStatus}
        onValueChange={handleStatusChange}
        disabled={isDisabled}
      >
        <SelectTrigger className="w-full h-9 text-xs">
          <SelectValue>
            <div className="flex items-center gap-2">
              <CurrentIcon className={`h-3.5 w-3.5 ${currentStatusData?.color}`} />
              <span>{currentStatusData?.label}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {statuses.map((status) => {
            const Icon = status.icon
            return (
              <SelectItem key={status.value} value={status.value} className="text-xs">
                <div className="flex items-center gap-2">
                  <Icon className={`h-3.5 w-3.5 ${status.color}`} />
                  <span>{status.label}</span>
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}
