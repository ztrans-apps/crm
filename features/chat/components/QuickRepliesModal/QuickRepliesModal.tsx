// Quick replies modal component
'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Zap } from 'lucide-react'
import type { QuickReply } from '@/lib/types/chat'
import { replaceVariables, parseVariables } from '@/features/chat/utils'

interface QuickRepliesModalProps {
  open: boolean
  onClose: () => void
  quickReplies: QuickReply[]
  onSelect: (content: string) => void
  contactName?: string
}

export function QuickRepliesModal({
  open,
  onClose,
  quickReplies,
  onSelect,
  contactName = 'Customer',
}: QuickRepliesModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})
  const [selectedReply, setSelectedReply] = useState<QuickReply | null>(null)

  // Get unique categories
  const categories = Array.from(
    new Set(quickReplies.map((r) => r.category).filter(Boolean))
  ) as string[]

  // Filter quick replies
  const filteredReplies = quickReplies.filter((reply) => {
    // Filter by category
    if (selectedCategory && reply.category !== selectedCategory) {
      return false
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      return (
        reply.title.toLowerCase().includes(query) ||
        reply.content.toLowerCase().includes(query)
      )
    }

    return true
  })

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setSelectedCategory(null)
      setVariableValues({})
      setSelectedReply(null)
    }
  }, [open])

  const handleSelectReply = (reply: QuickReply) => {
    const variables = parseVariables(reply.content)

    if (variables.length === 0) {
      // No variables, use directly
      onSelect(reply.content)
      onClose()
    } else {
      // Has variables, show variable input
      setSelectedReply(reply)
      
      // Set default values
      const defaults: Record<string, string> = {}
      variables.forEach((variable) => {
        if (variable.toLowerCase().includes('name')) {
          defaults[variable] = contactName
        } else if (reply.variables && typeof reply.variables === 'object') {
          const vars = reply.variables as Record<string, any>
          const varValue = vars[variable]
          defaults[variable] = typeof varValue === 'string' ? varValue : ''
        } else {
          defaults[variable] = ''
        }
      })
      setVariableValues(defaults)
    }
  }

  const handleUseWithVariables = () => {
    if (!selectedReply) return

    const content = replaceVariables(selectedReply.content, variableValues)
    onSelect(content)
    onClose()
  }

  // Variable input view
  if (selectedReply) {
    const variables = parseVariables(selectedReply.content)

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Fill Variables - {selectedReply.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Preview */}
            <div className="p-3 bg-gray-50 rounded-md">
              <label className="text-xs text-gray-500 block mb-1">Preview</label>
              <p className="text-sm whitespace-pre-wrap">
                {replaceVariables(selectedReply.content, variableValues)}
              </p>
            </div>

            {/* Variable inputs */}
            <div className="space-y-3">
              {variables.map((variable) => (
                <div key={variable}>
                  <label className="text-sm font-medium block mb-1">
                    {variable}
                  </label>
                  <Input
                    value={variableValues[variable] || ''}
                    onChange={(e) =>
                      setVariableValues((prev) => ({
                        ...prev,
                        [variable]: e.target.value,
                      }))
                    }
                    placeholder={`Enter ${variable}`}
                  />
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setSelectedReply(null)}
                className="flex-1"
              >
                Back
              </Button>
              <Button onClick={handleUseWithVariables} className="flex-1">
                Use Reply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Quick replies list view
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2 text-yellow-500" />
            Quick Replies
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search quick replies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        )}

        {/* Quick replies list */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredReplies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Zap className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No quick replies found</p>
            </div>
          ) : (
            filteredReplies.map((reply) => {
              const hasVariables = parseVariables(reply.content).length > 0

              return (
                <button
                  key={reply.id}
                  onClick={() => handleSelectReply(reply)}
                  className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-medium text-sm">{reply.title}</h4>
                    {hasVariables && (
                      <Badge variant="secondary" className="text-xs">
                        Variables
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {reply.content}
                  </p>
                  {reply.category && (
                    <Badge variant="outline" className="text-xs mt-2">
                      {reply.category}
                    </Badge>
                  )}
                </button>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
