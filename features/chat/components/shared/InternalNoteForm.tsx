// Internal Note Form - For agent use only (handover notes, complaints, etc.)
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Save, AlertCircle } from 'lucide-react'
import { toast } from '@/lib/stores/toast-store'

interface InternalNoteFormProps {
  onSave: (content: string, noteType: 'internal') => Promise<void>
}

export function InternalNoteForm({ onSave }: InternalNoteFormProps) {
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!content.trim()) return

    try {
      setSaving(true)
      await onSave(content.trim(), 'internal')
      setContent('')
    } catch (error) {
      console.error('Error saving internal note:', error)
      toast.error('Gagal menyimpan catatan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 p-2 bg-vx-purple/5 rounded-lg border border-vx-purple/20">
        <AlertCircle className="h-4 w-4 text-vx-purple mt-0.5 flex-shrink-0" />
        <p className="text-xs text-vx-purple">
          Catatan internal untuk agent. Gunakan untuk mencatat komplain, info penting, atau catatan handover.
        </p>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Tulis catatan internal di sini... (misal: Customer komplain produk rusak, perlu follow up besok)"
        className="w-full px-3 py-2 text-sm border border-vx-border rounded-lg focus:outline-none focus:ring-2 focus:ring-vx-purple/30 resize-none"
        rows={4}
        disabled={saving}
      />

      <Button
        onClick={handleSave}
        disabled={!content.trim() || saving}
        size="sm"
        className="w-full bg-vx-purple hover:bg-vx-purple/90"
      >
        <Save className="h-3 w-3 mr-2" />
        {saving ? 'Menyimpan...' : 'Simpan Catatan'}
      </Button>
    </div>
  )
}
