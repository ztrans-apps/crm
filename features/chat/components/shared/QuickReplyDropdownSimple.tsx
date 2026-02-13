'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Zap } from 'lucide-react'
import type { QuickReply } from '@/lib/types/chat'

interface Props {
  show: boolean
  searchQuery: string
  onSelect: (content: string) => void
  conversation?: any // Conversation data for variable replacement
}

export function QuickReplyDropdownSimple({ show, searchQuery, onSelect, conversation }: Props) {
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (show) {
      loadQuickReplies()
    }
  }, [show])

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
    } catch (error) {
      console.error('Error loading quick replies:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!show) return null

  // Replace variables in content
  function replaceVariables(content: string): string {
    let result = content
    
    // Get customer name from conversation
    const customerName = conversation?.contact?.name || 
                        conversation?.contact?.phone_number || 
                        'Customer'
    
    // Replace {name} or {{name}} with customer name (support both formats)
    result = result.replace(/\{\{?name\}\}?/gi, customerName)
    
    // You can add more variables here
    // result = result.replace(/\{\{?phone\}\}?/gi, conversation?.contact?.phone_number || '')
    // result = result.replace(/\{\{?email\}\}?/gi, conversation?.contact?.email || '')
    
    return result
  }

  // Filter based on search
  const filtered = searchQuery
    ? quickReplies.filter(qr =>
        qr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        qr.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        qr.category?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : quickReplies

  return (
    <div 
      className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-xl border-2 border-blue-500 overflow-hidden max-w-xl"
      style={{ zIndex: 1000 }}
    >
      <div className="p-2 bg-blue-50 border-b flex items-center gap-2">
        <Zap className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium">Quick Replies</span>
        {searchQuery && (
          <span className="text-xs text-gray-500">({filtered.length} results)</span>
        )}
      </div>

      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            {searchQuery ? 'No results found' : 'No quick replies yet'}
          </div>
        ) : (
          filtered.map((qr) => (
            <div
              key={qr.id}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                // Replace variables before sending
                const contentWithVariables = replaceVariables(qr.content)
                onSelect(contentWithVariables)
              }}
              className="p-3 border-b last:border-b-0 hover:bg-blue-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-900">{qr.title}</span>
                {qr.category && (
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                    {qr.category}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 line-clamp-2">{qr.content}</p>
            </div>
          ))
        )}
      </div>

      <div className="p-2 bg-gray-50 border-t text-center text-xs text-gray-500">
        Click to select • Type to search
      </div>
    </div>
  )
}
