// app/owner/broadcasts/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Radio, Plus, Send, Users, Loader2 } from 'lucide-react'

export default function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [sending, setSending] = useState(false)
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [formData, setFormData] = useState({
    name: '',
    message: '',
    session_id: ''
  })

  const supabase = createClient()
  const serviceUrl = process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL || 'http://localhost:3001'

  useEffect(() => {
    loadBroadcasts()
    loadContacts()
    loadSessions()
  }, [])

  const loadBroadcasts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('broadcasts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (data) setBroadcasts(data)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const loadContacts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)

      if (data) setContacts(data)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const loadSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'connected')

      if (data) setSessions(data)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedContacts.length === 0) {
      alert('Please select at least one contact')
      return
    }

    if (!formData.session_id) {
      alert('Please select a WhatsApp session')
      return
    }

    setSending(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Create broadcast record
      const { data: broadcast, error: broadcastError } = await supabase
        .from('broadcasts')
        // @ts-ignore - Supabase type issue
        .insert({
          user_id: user.id,
          whatsapp_session_id: formData.session_id,
          name: formData.name,
          message: formData.message,
          total_recipients: selectedContacts.length,
          status: 'sending'
        })
        .select()
        .single()

      if (broadcastError) throw broadcastError

      // Get selected contacts details
      const { data: contactsData } = await supabase
        .from('contacts')
        .select('*')
        .in('id', selectedContacts)

      if (!contactsData) throw new Error('Failed to load contacts')

      // Send via WhatsApp Service
      const response = await fetch(`${serviceUrl}/api/whatsapp/send-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: formData.session_id,
          recipients: contactsData.map((c: any) => ({
            phone: c.phone_number,
            message: formData.message
          }))
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || 'Failed to send broadcast')
      }

      // Update broadcast status
      await supabase
        .from('broadcasts')
        // @ts-ignore - Supabase type issue
        .update({
          status: 'completed',
          sent_count: result.sent || selectedContacts.length
        })
        .eq('id', broadcast.id)

      alert('Broadcast sent successfully!')
      setShowForm(false)
      setFormData({ name: '', message: '', session_id: '' })
      setSelectedContacts([])
      loadBroadcasts()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setSending(false)
    }
  }

  const toggleContact = (contactId: string) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    )
  }

  const selectAll = () => {
    setSelectedContacts(contacts.map(c => c.id))
  }

  const deselectAll = () => {
    setSelectedContacts([])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Broadcasts</h1>
          <p className="text-gray-600 mt-1">Send bulk messages to contacts</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} disabled={sessions.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          New Broadcast
        </Button>
      </div>

      {sessions.length === 0 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <p className="text-yellow-800">
              Please connect a WhatsApp session first before creating broadcasts.
            </p>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Broadcast</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Broadcast Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Monthly Newsletter"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>WhatsApp Session *</Label>
                <select
                  value={formData.session_id}
                  onChange={(e) => setFormData({ ...formData, session_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="">Select session</option>
                  {sessions.map(session => (
                    <option key={session.id} value={session.id}>
                      {session.session_name} ({session.phone_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Message *</Label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                  placeholder="Type your message here..."
                  required
                />
                <p className="text-xs text-gray-500">
                  {formData.message.length} characters
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Select Recipients ({selectedContacts.length} selected)</Label>
                  <div className="space-x-2">
                    <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                      Select All
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={deselectAll}>
                      Deselect All
                    </Button>
                  </div>
                </div>
                <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                  {contacts.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No contacts available</p>
                  ) : (
                    <div className="space-y-2">
                      {contacts.map(contact => (
                        <label key={contact.id} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedContacts.includes(contact.id)}
                            onChange={() => toggleContact(contact.id)}
                            className="rounded"
                          />
                          <span className="text-sm">
                            {contact.name} ({contact.phone_number})
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex space-x-2">
                <Button type="submit" disabled={sending}>
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Broadcast
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {broadcasts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Radio className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600">No broadcasts yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {broadcasts.map((broadcast) => (
            <Card key={broadcast.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{broadcast.name}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{broadcast.message}</p>
                    <div className="flex items-center space-x-3 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {broadcast.sent_count || 0}/{broadcast.total_recipients} sent
                      </span>
                      <Badge className={
                        broadcast.status === 'completed' ? 'bg-green-100 text-green-800' :
                        broadcast.status === 'sending' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {broadcast.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
