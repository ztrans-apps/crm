// Quick Replies Management Page - Owner only
'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AuthGuard } from '@/core/auth'
import { createClient } from '@/lib/supabase/client'

interface QuickReply {
  id: string
  title: string
  content: string
  category: string
  variables: any
  user_id: string
  created_at: string
}

export default function QuickRepliesPage() {
  return (
    <AuthGuard>
      <QuickRepliesContent />
    </AuthGuard>
  )
}

function QuickRepliesContent() {
  const supabase = createClient()
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'General',
  })

  useEffect(() => {
    initializeUser()
  }, [])

  useEffect(() => {
    if (userId) {
      loadQuickReplies()
    }
  }, [userId])

  const initializeUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      // @ts-ignore
      setUserRole(profile?.role || null)
    } catch (error) {
      console.error('Error initializing user:', error)
    }
  }

  const loadQuickReplies = async () => {
    try {
      setLoading(true)

      // @ts-ignore
      const { data, error } = await supabase
        .from('quick_replies')
        .select('*')
        // @ts-ignore
        .eq('user_id', userId)
        .order('title')

      if (error) throw error

      setQuickReplies(data || [])
    } catch (error) {
      console.error('Error loading quick replies:', error)
      alert('Failed to load quick replies')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setIsAdding(true)
    setFormData({ title: '', content: '', category: 'General' })
  }

  const handleEdit = (reply: QuickReply) => {
    setEditingId(reply.id)
    setFormData({
      title: reply.title,
      content: reply.content,
      category: reply.category || 'General',
    })
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    setFormData({ title: '', content: '', category: 'General' })
  }

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Title and content are required')
      return
    }

    try {
      if (isAdding) {
        // Add new quick reply
        // @ts-ignore
        const { error } = await supabase
          .from('quick_replies')
          // @ts-ignore
          .insert({
            title: formData.title.trim(),
            content: formData.content.trim(),
            category: formData.category,
            user_id: userId,
            variables: {},
          })

        if (error) throw error
        alert('Quick reply added successfully!')
      } else if (editingId) {
        // Update existing quick reply
        // @ts-ignore
        const { error } = await supabase
          .from('quick_replies')
          // @ts-ignore
          .update({
            title: formData.title.trim(),
            content: formData.content.trim(),
            category: formData.category,
          })
          .eq('id', editingId)

        if (error) throw error
        alert('Quick reply updated successfully!')
      }

      handleCancel()
      loadQuickReplies()
    } catch (error: any) {
      console.error('Error saving quick reply:', error)
      alert('Failed to save quick reply: ' + error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quick reply?')) return

    try {
      // @ts-ignore
      const { error } = await supabase
        .from('quick_replies')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('Quick reply deleted successfully!')
      loadQuickReplies()
    } catch (error: any) {
      console.error('Error deleting quick reply:', error)
      alert('Failed to delete quick reply: ' + error.message)
    }
  }

  // Check if user is owner
  if (userRole && userRole !== 'owner') {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800">
              You don't have permission to manage quick replies. Only owners can access this page.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quick Replies</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage quick reply templates for faster responses
            </p>
          </div>
          {!isAdding && !editingId && (
            <Button onClick={handleAdd} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Quick Reply
            </Button>
          )}
        </div>

        {/* Add/Edit Form */}
        {(isAdding || editingId) && (
          <div className="bg-white rounded-lg border p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">
              {isAdding ? 'Add New Quick Reply' : 'Edit Quick Reply'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <Input
                  placeholder="e.g., Hello, Thanks, Order Status"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="max-w-md"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Short name for this quick reply
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="General">General</option>
                  <option value="Support">Support</option>
                  <option value="Sales">Sales</option>
                  <option value="Information">Information</option>
                  <option value="Follow-up">Follow-up</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <Textarea
                  placeholder="Enter the reply message..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use {'{'}name{'}'} to insert customer name
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save
                </Button>
                <Button onClick={handleCancel} variant="outline" className="flex items-center gap-2">
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Replies List */}
        <div className="bg-white rounded-lg border">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Loading quick replies...</p>
            </div>
          ) : quickReplies.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 mb-4">No quick replies yet</p>
              <Button onClick={handleAdd} variant="outline" className="flex items-center gap-2 mx-auto">
                <Plus className="h-4 w-4" />
                Add Your First Quick Reply
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {quickReplies.map((reply) => (
                <div key={reply.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900">
                          {reply.title}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                          {reply.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {reply.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(reply)}
                        className="p-2 hover:bg-gray-200 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(reply.id)}
                        className="p-2 hover:bg-red-100 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">How to use Quick Replies:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Click the lightning icon (⚡) in the chat input</li>
            <li>• Select a quick reply from the dropdown</li>
            <li>• The content will be inserted into your message</li>
            <li>• You can edit the message before sending</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
