// Reusable Note Form Component
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { FileText, Save, Star, ChevronDown } from 'lucide-react'

interface NoteFormProps {
  onSave: (content: string, rating: number | null) => Promise<void>
}

export function NoteForm({ onSave }: NoteFormProps) {
  const [content, setContent] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [hoveredStar, setHoveredStar] = useState<number | null>(null)

  const handleSubmit = async () => {
    if (!content.trim()) return

    setSaving(true)
    try {
      await onSave(content, rating)
      setContent('')
      setRating(null)
    } catch (error) {
      console.error('Error saving note:', error)
    } finally {
      setSaving(false)
    }
  }

  const displayRating = hoveredStar !== null ? hoveredStar : (rating || 0)

  return (
    <div className="bg-vx-surface rounded-lg border border-vx-border p-3 space-y-2">
      <div className="flex items-center justify-end">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!content.trim() || saving}
          className="h-8 px-4 bg-vx-teal hover:bg-vx-teal/90 text-xs"
        >
          {saving ? (
            <div className="flex items-center space-x-1">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
              <span>Saving...</span>
            </div>
          ) : (
            <>
              <Save className="h-3 w-3 mr-1" />
              Save
            </>
          )}
        </Button>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-vx-text-secondary">
            Rate this chat note:
          </span>
          <span className="text-base font-semibold text-vx-teal">
            {displayRating}/10
          </span>
        </div>

        <div 
          className="flex space-x-0.5"
          onMouseLeave={() => setHoveredStar(null)}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
            <button
              key={star}
              onClick={() => setRating(rating === star ? null : star)}
              onMouseEnter={() => setHoveredStar(star)}
              className="focus:outline-none hover:scale-110 transition-transform"
            >
              <Star
                className={`h-5 w-5 ${
                  star <= displayRating
                    ? 'fill-yellow-400 text-yellow-400' 
                    : 'text-vx-text-muted'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <Textarea
        placeholder="Add your notes here..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className="text-xs resize-none border-vx-border focus:border-vx-teal focus:ring-vx-teal/30"
      />
    </div>
  )
}

// Note Card Component
interface NoteCardProps {
  note: any
  defaultExpanded?: boolean
}

export function NoteCard({ note, defaultExpanded = false }: NoteCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  // Get author name and email
  const authorName = note.created_by_user?.full_name || 'Unknown User'
  const authorEmail = note.created_by_user?.email || ''

  // Format timestamp
  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return '1 day ago'
    if (diffInDays < 7) return `${diffInDays} days ago`
    
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className="bg-vx-surface-elevated rounded-lg border border-vx-border overflow-hidden">
      <div className="p-2.5">
        {/* Author Header */}
        <div className="mb-1.5">
          <p className="text-xs font-semibold text-vx-text">
            {authorName}:
          </p>
        </div>

        {/* Content - Show when expanded */}
        {isExpanded && note.content && (
          <div className="mb-2">
            <p className="text-xs text-vx-text-secondary leading-relaxed whitespace-pre-wrap">
              {note.content}
            </p>
          </div>
        )}

        {/* Rating - Always show when exists */}
        {note.rating && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[10px] text-vx-text-secondary">Rating:</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                <Star
                  key={star}
                  className={`h-3 w-3 ${
                    star <= note.rating ? 'fill-yellow-400 text-yellow-400' : 'text-vx-text-muted'
                  }`}
                />
              ))}
            </div>
            <span className="text-[10px] font-semibold text-vx-text-secondary">
              ({note.rating}/10)
            </span>
          </div>
        )}

        {/* Timestamp and Toggle */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-vx-text-muted">
            {formatTimestamp(note.created_at)}
          </p>
          
          {/* Toggle button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0.5 hover:bg-vx-surface-hover rounded transition-colors"
          >
            <ChevronDown 
              className={`h-3.5 w-3.5 text-vx-text-muted transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
