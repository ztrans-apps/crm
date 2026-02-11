// app/owner/chatbots/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Bot, Plus, Power, PowerOff } from 'lucide-react'

export default function ChatbotsPage() {
  const [chatbots, setChatbots] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    welcome_message: '',
    fallback_message: '',
    is_active: true
  })

  const supabase = createClient()

  useEffect(() => {
    loadChatbots()
  }, [])

  const loadChatbots = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('chatbots')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (data) setChatbots(data)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // @ts-ignore - Supabase type issue
      const { error } = await supabase.from('chatbots').insert({
        user_id: user.id,
        ...formData
      })

      if (error) throw error

      alert('Chatbot created successfully!')
      setShowForm(false)
      setFormData({ name: '', welcome_message: '', fallback_message: '', is_active: true })
      loadChatbots()
    } catch (error: any) {
      alert(error.message)
    }
  }

  const toggleChatbot = async (chatbotId: string, currentStatus: boolean) => {
    try {
      // @ts-ignore - Supabase type issue
      const { error } = await supabase.from('chatbots').update({ is_active: !currentStatus }).eq('id', chatbotId)

      if (error) throw error

      loadChatbots()
    } catch (error: any) {
      alert(error.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chatbots</h1>
          <p className="text-gray-600 mt-1">Automate responses with chatbots</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Chatbot
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Chatbot</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Chatbot Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Customer Support Bot"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Welcome Message *</Label>
                <Textarea
                  value={formData.welcome_message}
                  onChange={(e) => setFormData({ ...formData, welcome_message: e.target.value })}
                  rows={3}
                  placeholder="Hello! How can I help you today?"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Fallback Message *</Label>
                <Textarea
                  value={formData.fallback_message}
                  onChange={(e) => setFormData({ ...formData, fallback_message: e.target.value })}
                  rows={3}
                  placeholder="I'm sorry, I didn't understand that. Please contact our support team."
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Activate immediately
                </Label>
              </div>
              <div className="flex space-x-2">
                <Button type="submit">Create Chatbot</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {chatbots.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Bot className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600">No chatbots yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {chatbots.map((chatbot) => (
            <Card key={chatbot.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{chatbot.name}</h3>
                    <Badge className={chatbot.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {chatbot.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {chatbot.is_active ? (
                    <Power className="h-5 w-5 text-green-600" />
                  ) : (
                    <PowerOff className="h-5 w-5 text-gray-400" />
                  )}
                </div>

                <div className="space-y-3 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Welcome Message:</p>
                    <p className="text-sm text-gray-700 line-clamp-2">{chatbot.welcome_message}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Fallback Message:</p>
                    <p className="text-sm text-gray-700 line-clamp-2">{chatbot.fallback_message}</p>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => toggleChatbot(chatbot.id, chatbot.is_active)}
                  >
                    {chatbot.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
