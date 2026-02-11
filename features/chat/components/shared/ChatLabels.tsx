// Chat labels component for agent
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Plus } from 'lucide-react'
import type { Label, ConversationLabel } from '@/lib/types/chat'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface ChatLabelsProps {
  appliedLabels: (ConversationLabel & { label: Label })[]
  availableLabels: Label[]
  onApplyLabel: (labelId: string) => Promise<void>
  onRemoveLabel: (labelId: string) => Promise<void>
  loading?: boolean
}

export function ChatLabels({
  appliedLabels,
  availableLabels,
  onApplyLabel,
  onRemoveLabel,
  loading = false,
}: ChatLabelsProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [applying, setApplying] = useState<string | null>(null)

  const handleApplyLabel = async (labelId: string) => {
    setApplying(labelId)
    try {
      await onApplyLabel(labelId)
      setDialogOpen(false)
    } finally {
      setApplying(null)
    }
  }

  const handleRemoveLabel = async (labelId: string) => {
    await onRemoveLabel(labelId)
  }

  const appliedLabelIds = appliedLabels.map((cl) => cl.label_id)
  const unappliedLabels = availableLabels.filter(
    (label) => !appliedLabelIds.includes(label.id)
  )

  const canAddMore = appliedLabels.length < 5

  return (
    <div className="space-y-2">
      {/* Applied labels */}
      {appliedLabels.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {appliedLabels.map((cl) => (
            <Badge
              key={cl.id}
              variant="outline"
              className="pl-2 pr-1 py-0.5 text-[10px]"
              style={{ borderColor: cl.label.color, color: cl.label.color }}
            >
              <span>{cl.label.name}</span>
              <button
                onClick={() => handleRemoveLabel(cl.label_id)}
                className="ml-1 hover:bg-gray-100 rounded-full p-0.5"
                disabled={loading}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-gray-500">No labels applied</p>
      )}

      {/* Add label button */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 text-xs"
            disabled={!canAddMore || loading}
          >
            <Plus className="h-3 w-3 mr-1" />
            {canAddMore ? 'Set chat label' : 'Maximum labels reached'}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Label</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {unappliedLabels.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                All labels have been applied
              </p>
            ) : (
              unappliedLabels.map((label) => (
                <button
                  key={label.id}
                  onClick={() => handleApplyLabel(label.id)}
                  disabled={applying !== null}
                  className="w-full p-3 border rounded-lg hover:bg-gray-50 transition-colors text-left flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="font-medium">{label.name}</span>
                  </div>
                  {applying === label.id && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                  )}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
