// Review Form - For customer feedback with rating
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Save, Star } from 'lucide-react'
import { toast } from '@/lib/stores/toast-store'

interface ReviewFormProps {
  onSave: (content: string, rating: number, noteType: 'review') => Promise<void>
}

export function ReviewForm({ onSave }: ReviewFormProps) {
  const [content, setContent] = useState('')
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!content.trim() || rating === 0) return

    try {
      setSaving(true)
      await onSave(content.trim(), rating, 'review')
      setContent('')
      setRating(0)
    } catch (error) {
      console.error('Error saving review:', error)
      toast.error('Gagal menyimpan review')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Rating Stars */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-vx-text-secondary">
            Rating Customer:
          </span>
          <span className="text-base font-semibold text-vx-teal">
            {rating}/10
          </span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              disabled={saving}
              className="focus:outline-none transition-transform hover:scale-110"
            >
              <Star
                className={`h-5 w-5 ${
                  star <= (hoveredRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-vx-text-muted'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Review Text */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Tulis review atau feedback dari customer..."
        className="w-full px-3 py-2 text-sm border border-vx-border rounded-lg focus:outline-none focus:ring-2 focus:ring-vx-teal/30 resize-none"
        rows={3}
        disabled={saving}
      />

      <Button
        onClick={handleSave}
        disabled={!content.trim() || rating === 0 || saving}
        size="sm"
        className="w-full bg-vx-teal hover:bg-vx-teal/90"
      >
        <Save className="h-3 w-3 mr-2" />
        {saving ? 'Menyimpan...' : 'Simpan Review'}
      </Button>
    </div>
  )
}
