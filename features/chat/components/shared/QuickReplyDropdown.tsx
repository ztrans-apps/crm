'use client'

// Quick Reply Dropdown Component
// Muncul saat user ketik "/" di input message

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Zap, X } from 'lucide-react'
import type { QuickReply } from '@/lib/types/chat'

interface QuickReplyDropdownProps {
  show: boolean
  searchQuery: string
  onSelect: (content: string) => void
  onClose: () => void
  position?: { top: number; left: number }
}

export function QuickReplyDropdown({
  show,
  searchQuery,
  onSelect,
  onClose,
  position
}: QuickReplyDropdownProps) {
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [filteredReplies, setFilteredReplies] = useState<QuickReply[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Load quick replies
  useEffect(() => {
    if (show) {
      loadQuickReplies()
    }
  }, [show])

  // Filter quick replies based on search
  useEffect(() => {
    if (!searchQuery) {
      setFilteredReplies(quickReplies)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = quickReplies.filter(qr => {
        return qr.title.toLowerCase().includes(query) ||
               qr.content.toLowerCase().includes(query) ||
               qr.category?.toLowerCase().includes(query)
      })
      setFilteredReplies(filtered)
    }
    setSelectedIndex(0)
  }, [searchQuery, quickReplies])

  // Handle keyboard navigation
  useEffect(() => {
    if (!show) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          e.stopPropagation()
          setSelectedIndex(prev => 
            prev < filteredReplies.length - 1 ? prev + 1 : prev
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          e.stopPropagation()
          setSelectedIndex(prev => prev > 0 ? prev - 1 : 0)
          break
        case 'Enter':
          e.preventDefault()
          e.stopPropagation()
          if (filteredReplies[selectedIndex]) {
            handleSelect(filteredReplies[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          e.stopPropagation()
          onClose()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [show, filteredReplies, selectedIndex, onClose])

  // Scroll selected item into view
  useEffect(() => {
    if (dropdownRef.current) {
      const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex])

  async function loadQuickReplies() {
    try {
      setLoading(true)
      
      // Load ALL quick replies (no user filter - shared across all users)
      const { data, error } = await supabase
        .from('quick_replies')
        .select('*')
        .order('title')

      if (error) throw error

      setQuickReplies(data || [])
      setFilteredReplies(data || [])
    } catch (error) {
      console.error('Error loading quick replies:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleSelect(quickReply: QuickReply) {
    try {
      // Replace variables in content
      let content = quickReply.content
      
      // Simple variable replacement
      // Variables format: {{variable_name}}
      if (quickReply.variables) {
        Object.entries(quickReply.variables).forEach(([key, value]) => {
          content = content.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
        })
      }

      onSelect(content)
      onClose()
    } catch (error) {
      console.error('Error in handleSelect:', error)
    }
  }

  if (!show) return null

  return (
    <div 
      className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-2xl border-2 border-blue-500 overflow-hidden"
      style={{ 
        zIndex: 50,
        maxWidth: '600px',
        ...(position ? { top: position.top, left: position.left, bottom: 'auto' } : {})
      }}
      onMouseDown={(e) => {
        // Prevent input from losing focus when clicking dropdown
        e.preventDefault()
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-blue-50">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">Quick Replies</span>
          {searchQuery && (
            <span className="text-xs text-gray-500">
              ({filteredReplies.length} results)
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onClose()
          }}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search hint */}
      {!searchQuery && (
        <div className="p-2 bg-blue-50 border-b">
          <p className="text-xs text-blue-700 flex items-center gap-1">
            <Search className="h-3 w-3" />
            Type to search quick replies...
          </p>
        </div>
      )}

      {/* Quick replies list */}
      <div 
        ref={dropdownRef}
        className="max-h-64 overflow-y-auto"
      >
        {loading ? (
          <div className="p-4 text-center text-sm text-gray-500">
            Loading quick replies...
          </div>
        ) : filteredReplies.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500 mb-2">
              {searchQuery ? 'No quick replies found' : 'No quick replies yet'}
            </p>
            <p className="text-xs text-gray-400">
              {searchQuery ? 'Try a different search term' : 'Create quick replies in settings'}
            </p>
          </div>
        ) : (
          filteredReplies.map((qr, index) => (
            <button
              key={qr.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleSelect(qr)
              }}
              className={`w-full text-left p-3 border-b last:border-b-0 transition-colors ${
                index === selectedIndex
                  ? 'bg-blue-50 border-l-4 border-l-blue-500'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {qr.title}
                    </h4>
                    {qr.category && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {qr.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {qr.content}
                  </p>
                </div>
                {index === selectedIndex && (
                  <div className="text-xs text-blue-600 font-medium">
                    ↵
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer hint */}
      <div className="p-2 bg-gray-50 border-t">
        <p className="text-xs text-gray-500 text-center">
          Use ↑↓ to navigate • Enter to select • Esc to close
        </p>
      </div>
    </div>
  )
}
