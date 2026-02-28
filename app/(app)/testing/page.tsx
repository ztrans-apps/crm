'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/lib/stores/toast-store'
import { useNotificationSound } from '@/lib/hooks/use-notification-sound'
import { MessageSquare, Send, User, Phone, Image, MapPin, FileText, Quote, Volume2 } from 'lucide-react'

type MessageContentType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'location'

export default function TestingPage() {
  const [loading, setLoading] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('6281234567890')
  const [contactName, setContactName] = useState('Test User')
  const [messageText, setMessageText] = useState('Hello, this is a test message')
  const [messageType, setMessageType] = useState<'incoming' | 'outgoing'>('incoming')
  const [contentType, setContentType] = useState<MessageContentType>('text')
  const [mediaUrl, setMediaUrl] = useState('https://picsum.photos/400/300')
  const [latitude, setLatitude] = useState('-6.2088')
  const [longitude, setLongitude] = useState('106.8456')
  const [locationName, setLocationName] = useState('Jakarta, Indonesia')
  const [quotedMessageId, setQuotedMessageId] = useState('')
  const [recentMessages, setRecentMessages] = useState<Array<{
    id: string
    content: string
    type: string
    sender_type: string
  }>>([])
  
  const { play: playNotification, isEnabled: notificationEnabled } = useNotificationSound()
  const fetchRecentMessages = async () => {
    try {
      const response = await fetch(`/api/testing/messages?phone_number=${phoneNumber}`)
      if (response.ok) {
        const data = await response.json()
        setRecentMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  const handleCreateContact = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/testing/create-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneNumber,
          name: contactName,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Contact created successfully!', 'Success', 5000)
      } else {
        toast.error(data.error || 'Failed to create contact', 'Error', 5000)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create contact', 'Error', 5000)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateConversation = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/testing/create-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneNumber,
          contact_name: contactName,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message || 'Conversation created successfully!', 'Success', 5000)
      } else {
        toast.error(data.error || 'Failed to create conversation', 'Error', 5000)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create conversation', 'Error', 5000)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    setLoading(true)
    try {
      const payload: any = {
        phone_number: phoneNumber,
        type: messageType,
        content_type: contentType,
      }

      if (contentType === 'text') {
        payload.message = messageText
        if (quotedMessageId) {
          payload.quoted_message_id = quotedMessageId
        }
      } else if (contentType === 'location') {
        payload.latitude = parseFloat(latitude)
        payload.longitude = parseFloat(longitude)
        payload.location_name = locationName
      } else {
        // media types
        payload.media_url = mediaUrl
        payload.caption = messageText
      }

      const response = await fetch('/api/testing/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`${messageType === 'incoming' ? 'Incoming' : 'Outgoing'} ${contentType} message sent!`, 'Success', 5000)
        if (contentType === 'text') {
          setMessageText('Hello, this is a test message')
        }
        if (data.message?.id) {
          setQuotedMessageId(data.message.id)
        }
        // Refresh messages list
        fetchRecentMessages()
      } else {
        toast.error(data.error || 'Failed to send message', 'Error', 5000)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message', 'Error', 5000)
    } finally {
      setLoading(false)
    }
  }

  const handleSimulateConversation = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/testing/simulate-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneNumber,
          contact_name: contactName,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message || 'Full conversation simulated successfully!', 'Success', 5000)
        // Refresh messages list
        fetchRecentMessages()
      } else {
        toast.error(data.error || 'Failed to simulate conversation', 'Error', 5000)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to simulate conversation', 'Error', 5000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">WhatsApp Testing Tool</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Simulate conversations and messages for testing without WhatsApp connection
        </p>
      </div>

      <div className="grid gap-6">
        {/* Contact Setup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Setup
            </CardTitle>
            <CardDescription>
              Configure the test contact details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="6281234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Contact Name</Label>
              <Input
                id="name"
                placeholder="Test User"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateContact} disabled={loading}>
                <User className="h-4 w-4 mr-2" />
                Create Contact
              </Button>
              <Button onClick={handleCreateConversation} disabled={loading} variant="outline">
                <MessageSquare className="h-4 w-4 mr-2" />
                Create Conversation
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Message Simulator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Message Simulator
            </CardTitle>
            <CardDescription>
              Send test messages with various content types
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Message Direction</Label>
              <div className="flex gap-2">
                <Button
                  variant={messageType === 'incoming' ? 'default' : 'outline'}
                  onClick={() => setMessageType('incoming')}
                  className="flex-1"
                >
                  Incoming
                </Button>
                <Button
                  variant={messageType === 'outgoing' ? 'default' : 'outline'}
                  onClick={() => setMessageType('outgoing')}
                  className="flex-1"
                >
                  Outgoing
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Content Type</Label>
              <Select value={contentType} onValueChange={(v) => setContentType(v as MessageContentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text Message</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="location">Location</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {contentType === 'text' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="message">Message Text</Label>
                  <Textarea
                    id="message"
                    placeholder="Type your test message here..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    rows={4}
                  />
                </div>
                
                {/* Recent Messages for Quoting */}
                {recentMessages.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Recent Messages (Click to Quote)</Label>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={fetchRecentMessages}
                        type="button"
                      >
                        Refresh
                      </Button>
                    </div>
                    <div className="border rounded-lg max-h-48 overflow-y-auto">
                      {recentMessages.map((msg) => (
                        <button
                          key={msg.id}
                          type="button"
                          onClick={() => {
                            setQuotedMessageId(msg.id)
                            toast.success('Message selected for quoting!', 'Ready', 3000)
                          }}
                          className={`w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-800 border-b last:border-b-0 transition-colors ${
                            quotedMessageId === msg.id ? 'bg-blue-50 dark:bg-blue-950' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className={`text-xs px-2 py-1 rounded ${
                              msg.sender_type === 'customer' 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            }`}>
                              {msg.sender_type === 'customer' ? 'Incoming' : 'Outgoing'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{msg.content}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {msg.type} • ID: {msg.id.slice(0, 8)}...
                              </p>
                            </div>
                            {quotedMessageId === msg.id && (
                              <Quote className="h-4 w-4 text-blue-500 shrink-0" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="quoted">Quoted Message ID (optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="quoted"
                      placeholder="Select from recent messages or paste ID"
                      value={quotedMessageId}
                      onChange={(e) => setQuotedMessageId(e.target.value)}
                      className="flex-1"
                    />
                    {quotedMessageId && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setQuotedMessageId('')}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  {!quotedMessageId && (
                    <p className="text-xs text-gray-500">Click a message above to quote it, or paste an ID manually</p>
                  )}
                  {quotedMessageId && (
                    <p className="text-xs text-green-600 dark:text-green-400">✓ Ready to send as reply</p>
                  )}
                </div>
              </>
            )}

            {(contentType === 'image' || contentType === 'video' || contentType === 'audio' || contentType === 'document') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="mediaUrl">Media URL</Label>
                  <Input
                    id="mediaUrl"
                    placeholder="https://example.com/media.jpg"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="caption">Caption (optional)</Label>
                  <Textarea
                    id="caption"
                    placeholder="Add a caption..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    rows={2}
                  />
                </div>
              </>
            )}

            {contentType === 'location' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lat">Latitude</Label>
                    <Input
                      id="lat"
                      placeholder="-6.2088"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lng">Longitude</Label>
                    <Input
                      id="lng"
                      placeholder="106.8456"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="locName">Location Name</Label>
                  <Input
                    id="locName"
                    placeholder="Jakarta, Indonesia"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                  />
                </div>
              </>
            )}

            <Button onClick={handleSendMessage} disabled={loading} className="w-full">
              <Send className="h-4 w-4 mr-2" />
              Send {messageType === 'incoming' ? 'Incoming' : 'Outgoing'} {contentType.charAt(0).toUpperCase() + contentType.slice(1)}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Quick Test Actions
            </CardTitle>
            <CardDescription>
              Test various scenarios with one click
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={handleSimulateConversation} 
              disabled={loading}
              className="w-full"
              variant="secondary"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Simulate Full Conversation (5 messages)
            </Button>
            
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={() => {
                  setContentType('image')
                  setMediaUrl('https://picsum.photos/800/600')
                  setMessageText('Check out this image!')
                  toast.info('Image test ready - click Send button', 'Ready', 3000)
                }}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <Image className="h-4 w-4 mr-2" />
                Test Image
              </Button>
              
              <Button 
                onClick={() => {
                  setContentType('location')
                  setLatitude('-6.2088')
                  setLongitude('106.8456')
                  setLocationName('Monas, Jakarta')
                  toast.info('Location test ready - click Send button', 'Ready', 3000)
                }}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Test Location
              </Button>
              
              <Button 
                onClick={() => {
                  setContentType('document')
                  setMediaUrl('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf')
                  setMessageText('Here is a document')
                  toast.info('Document test ready - click Send button', 'Ready', 3000)
                }}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <FileText className="h-4 w-4 mr-2" />
                Test Document
              </Button>
              
              <Button 
                onClick={() => {
                  setContentType('text')
                  setMessageText('This is a reply to previous message')
                  fetchRecentMessages()
                  toast.info('Select a message from the list to quote!', 'Info', 3000)
                }}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <Quote className="h-4 w-4 mr-2" />
                Test Quote
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">How to Use</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 dark:text-blue-200 space-y-2 text-sm">
            <p><strong>Basic Flow:</strong></p>
            <p>1. Set up contact details (phone number and name)</p>
            <p>2. Click "Create Contact" to add contact to database</p>
            <p>3. Send messages - conversation will be created automatically</p>
            
            <p className="mt-3"><strong>Testing Different Content Types:</strong></p>
            <p>• Text: Type message and send</p>
            <p>• Media (Image/Video/Audio/Document): Provide URL and optional caption</p>
            <p>• Location: Enter coordinates and location name</p>
            <p>• Quoted Reply: Send a message first, copy its ID, then use it in "Quoted Message ID"</p>
            
            <p className="mt-3"><strong>Quick Test Buttons:</strong></p>
            <p>Use the quick test buttons to auto-fill sample data for each content type</p>
            
            <p className="mt-3"><strong>Testing Notification Sound:</strong></p>
            <p>• Click "Test Notification Sound" button below to preview</p>
            <p>• Send incoming messages to trigger notification in /chats page</p>
            <p>• Configure sound in Settings → Notifications</p>
            
            <p className="mt-4 font-semibold">💡 Tip: Check the Chats page to see your test conversations with all media types!</p>
          </CardContent>
        </Card>

        {/* Notification Test */}
        <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="text-purple-900 dark:text-purple-100 flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Notification Sound Test
            </CardTitle>
            <CardDescription className="text-purple-700 dark:text-purple-300">
              Test notification sound before sending messages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white dark:bg-purple-900/30 rounded-lg">
              <div>
                <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                  Notification Status
                </p>
                <p className="text-xs text-purple-700 dark:text-purple-300">
                  {notificationEnabled ? '✓ Enabled' : '✗ Disabled (enable in Settings)'}
                </p>
              </div>
              <Button
                onClick={() => {
                  playNotification()
                  toast.info('Playing notification sound...', 'Test', 2000)
                }}
                variant="outline"
                className="border-purple-300 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900"
              >
                <Volume2 className="h-4 w-4 mr-2" />
                Test Sound
              </Button>
            </div>
            <p className="text-xs text-purple-700 dark:text-purple-300">
              💡 This sound will play automatically when incoming messages arrive in the /chats page
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
