// app/(app)/whatsapp/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { QrCode, Plus, Trash2, RefreshCw, CheckCircle, XCircle, Loader2, Smartphone, AlertCircle } from 'lucide-react'
import Image from 'next/image'

// QR Expiry Timer Component
function QRExpiryTimer({ expiryTime }: { expiryTime: number }) {
  const [timeLeft, setTimeLeft] = useState<number>(0)

  useEffect(() => {
    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000))
      setTimeLeft(remaining)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [expiryTime])

  if (timeLeft === 0) {
    return (
      <div className="mt-3 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800 font-medium">
          ⏱️ QR code expired - waiting for new code...
        </p>
      </div>
    )
  }

  return (
    <div className="mt-3 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
      <p className="text-sm text-green-800">
        ⏱️ QR code expires in <span className="font-bold">{timeLeft}</span> seconds
      </p>
    </div>
  )
}

interface WhatsAppSession {
  id: string
  phone_number: string | null
  status: 'connected' | 'disconnected' | 'connecting'
  created_at: string
  last_activity: string | null
}

export default function WhatsAppPage() {
  const [sessions, setSessions] = useState<WhatsAppSession[]>([])
  const [loading, setLoading] = useState(true)
  const [showQR, setShowQR] = useState(false)
  const [showPhoneModal, setShowPhoneModal] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [initializingSession, setInitializingSession] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [qrExpiryTime, setQrExpiryTime] = useState<number | null>(null)

  // Fetch sessions from database
  const fetchSessions = async () => {
    try {
      setError(null)
      const response = await fetch('/api/whatsapp/sessions')
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions || [])
      } else {
        throw new Error('Failed to fetch sessions')
      }
    } catch (error: any) {
      console.error('Failed to fetch sessions:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Initialize new session
  const handleAddSession = async () => {
    setShowPhoneModal(true)
  }

  // Confirm and create session
  const handleConfirmAddSession = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter a phone number')
      return
    }

    try {
      setError(null)
      setInitializingSession('new')
      setShowPhoneModal(false)
      
      console.log('[Add Session] Creating session for phone:', phoneNumber)
      
      const response = await fetch('/api/whatsapp/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('[Add Session] Session created:', data.sessionId)
        
        // Refresh sessions to show new entry
        await fetchSessions()
        
        // Reset phone number
        setPhoneNumber('')
        
        // Wait a bit for DB to update
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Now trigger reconnect to show QR
        console.log('[Add Session] Triggering reconnect to show QR')
        await handleReconnect(data.sessionId)
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to initialize session')
      }
    } catch (error: any) {
      console.error('[Add Session] Error:', error)
      setError(error.message)
    } finally {
      setInitializingSession(null)
    }
  }

  // Poll for QR code
  const pollForQR = async (sessionId: string) => {
    console.log('[QR Poll] Starting to poll for session:', sessionId)
    let qrReceived = false
    let lastQrCode: string | null = null
    let qrExpiredCount = 0
    const MAX_QR_EXPIRED = 3 // After 3 QR expirations, stop trying
    let connectionDetected = false
    
    const interval = setInterval(async () => {
      try {
        console.log('[QR Poll] Fetching QR code...')
        const response = await fetch(`/api/whatsapp/qr/${sessionId}`)
        
        if (response.ok) {
          const data = await response.json()
          console.log('[QR Poll] Response:', { hasQR: !!data.qr, status: data.status })
          
          if (data.qr) {
            // Check if this is a new QR code (different from last one)
            if (data.qr !== lastQrCode) {
              console.log('[QR Poll] New QR code received!')
              setQrCode(data.qr)
              lastQrCode = data.qr
              qrReceived = true
              
              // Set expiry time to 40 seconds from now (Baileys default)
              setQrExpiryTime(Date.now() + 40000)
              
              // Reset error when new QR is received
              setError(null)
              
              // Reset connection detection
              connectionDetected = false
            }
          } else if (qrReceived && !data.qr && data.status !== 'connected') {
            // QR code disappeared but not connected - likely expired
            console.log('[QR Poll] QR code expired, waiting for new one...')
            qrExpiredCount++
            
            if (qrExpiredCount >= MAX_QR_EXPIRED) {
              console.log('[QR Poll] Too many QR expirations, stopping')
              clearInterval(interval)
              setError('QR code expired multiple times. Please try reconnecting again.')
              setShowQR(false)
              setQrCode(null)
              return
            }
            
            // Show message that QR expired and waiting for new one
            setError('QR code expired. Waiting for new QR code...')
            setQrCode(null)
          } else {
            console.log('[QR Poll] No QR code yet, status:', data.status)
          }
          
          // Only close modal if:
          // 1. We received QR code before (qrReceived = true)
          // 2. Status is now connected
          // 3. We haven't detected connection before (to avoid closing on old connection)
          if (data.status === 'connected' && qrReceived && !connectionDetected) {
            console.log('[QR Poll] Session connected after QR scan! Stopping poll.')
            connectionDetected = true
            clearInterval(interval)
            
            // Wait a bit to ensure database is updated
            setTimeout(() => {
              setShowQR(false)
              setQrCode(null)
              setError(null)
              setQrExpiryTime(null)
              fetchSessions()
            }, 2000)
          } else if (data.status === 'connected' && !qrReceived) {
            console.log('[QR Poll] Session already connected (old session), ignoring')
            // Don't close modal - this is an old connection, not from QR scan
          }
        } else {
          console.error('[QR Poll] Response not OK:', response.status)
        }
      } catch (error) {
        console.error('[QR Poll] Failed to fetch QR:', error)
      }
    }, 2000)

    // Stop polling after 3 minutes (increased from 2 minutes)
    setTimeout(() => {
      console.log('[QR Poll] Timeout reached, stopping poll')
      clearInterval(interval)
      if (!connectionDetected) {
        setError('QR code generation timeout. Please try reconnecting again.')
        setShowQR(false)
      }
    }, 180000)
  }

  // Reconnect session
  const handleReconnect = async (sessionId: string) => {
    try {
      setError(null)
      console.log('[Reconnect] Starting reconnect for session:', sessionId)
      
      // If session is stuck in 'connecting', reset it first
      const session = sessions.find(s => s.id === sessionId)
      if (session?.status === 'connecting') {
        console.log('[Reconnect] Session stuck in connecting, resetting status first...')
        
        // Call cleanup API to reset status
        await fetch('/api/whatsapp/cleanup', { method: 'POST' })
        
        // Wait a bit for status to update
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Refresh sessions
        await fetchSessions()
      }
      
      // Always use forceNew=true to ensure fresh QR if no auth files
      const response = await fetch(`/api/whatsapp/reconnect/${sessionId}?forceNew=true`, {
        method: 'POST'
      })
      
      if (response.ok) {
        console.log('[Reconnect] Reconnect initiated')
        
        // IMPORTANT: Wait for database to update status to "connecting"
        // before showing QR modal and starting polling
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        console.log('[Reconnect] Showing QR modal and starting polling')
        setShowQR(true)
        pollForQR(sessionId)
        
        // Refresh sessions after a delay
        setTimeout(() => {
          fetchSessions()
        }, 1000)
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reconnect')
      }
    } catch (error: any) {
      console.error('[Reconnect] Error:', error)
      setError(error.message)
    }
  }

  // Force disconnect - logout but keep session in DB
  const handleForceDisconnect = async (sessionId: string) => {
    if (!confirm('This will disconnect WhatsApp but keep the phone number saved. You can reconnect later.')) return

    try {
      setError(null)
      console.log('[Force Disconnect] Disconnecting session:', sessionId)
      
      const response = await fetch(`/api/whatsapp/disconnect/${sessionId}`, {
        method: 'POST'
      })
      
      if (response.ok) {
        console.log('[Force Disconnect] Session disconnected successfully')
        fetchSessions()
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to disconnect')
      }
    } catch (error: any) {
      console.error('[Force Disconnect] Error:', error)
      setError(error.message)
    }
  }

  // Delete session completely - remove from DB and delete auth files
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('This will permanently delete this WhatsApp number and all authentication data. Are you sure?')) return

    try {
      setError(null)
      console.log('[Delete Session] Deleting session:', sessionId)
      
      const response = await fetch(`/api/whatsapp/delete/${sessionId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        console.log('[Delete Session] Session deleted successfully')
        fetchSessions()
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete session')
      }
    } catch (error: any) {
      console.error('[Delete Session] Error:', error)
      setError(error.message)
    }
  }



  useEffect(() => {
    fetchSessions()
    
    // Auto-cleanup stuck sessions on mount
    fetch('/api/whatsapp/cleanup', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        console.log('[Auto-cleanup] Response:', data)
        if (data.success && data.cleaned > 0) {
          console.log(`[Auto-cleanup] Cleaned ${data.cleaned} stuck sessions`)
          // Refresh sessions after cleanup
          setTimeout(fetchSessions, 1000)
        } else if (!data.success) {
          console.error('[Auto-cleanup] Failed:', data.error)
          // Don't show error to user, just log it
        }
      })
      .catch(err => {
        console.error('[Auto-cleanup] Error:', err)
        // Don't show error to user, cleanup is optional
      })
    
    // Refresh sessions every 10 seconds
    const interval = setInterval(fetchSessions, 10000)
    return () => clearInterval(interval)
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        )
      case 'connecting':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Connecting
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-700">
            <XCircle className="h-3 w-3 mr-1" />
            Disconnected
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">WhatsApp Connections</h1>
          <p className="text-gray-600 mt-1">Manage your WhatsApp business numbers</p>
        </div>
        <Button 
          onClick={handleAddSession} 
          disabled={!!initializingSession}
          size="lg"
          className="bg-green-600 hover:bg-green-700"
        >
          {initializingSession ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Initializing...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add WhatsApp Number
            </>
          )}
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Phone Number Modal */}
      <Dialog open={showPhoneModal} onOpenChange={setShowPhoneModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add WhatsApp Number</DialogTitle>
            <DialogDescription>
              Enter the phone number you want to connect (with country code)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="+62812345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirmAddSession()
                  }
                }}
              />
              <p className="text-sm text-gray-500">
                Include country code (e.g., +62 for Indonesia)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPhoneModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmAddSession}
              disabled={!phoneNumber.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      {showQR && (
        <Card className="border-2 border-green-500 shadow-lg">
          <CardHeader className="bg-green-50">
            <CardTitle className="flex items-center gap-2 text-green-900">
              <Smartphone className="h-5 w-5" />
              Scan QR Code to Connect
            </CardTitle>
            <CardDescription className="text-green-700">
              Use your phone to scan this QR code and link your WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center">
              {qrCode ? (
                <>
                  <div className="relative p-4 bg-white rounded-xl shadow-md">
                    <Image 
                      src={qrCode} 
                      alt="QR Code" 
                      width={280} 
                      height={280}
                      className="rounded-lg"
                    />
                  </div>
                  {qrExpiryTime && (
                    <QRExpiryTimer expiryTime={qrExpiryTime} />
                  )}
                </>
              ) : (
                <div className="w-72 h-72 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <Loader2 className="h-12 w-12 text-green-600 animate-spin mx-auto mb-3" />
                    <p className="text-gray-600">Generating QR Code...</p>
                    <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
                  </div>
                </div>
              )}
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg max-w-md">
                <h4 className="font-medium text-blue-900 mb-2">How to connect:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Open WhatsApp on your phone</li>
                  <li>Tap Menu (⋮) or Settings</li>
                  <li>Select "Linked Devices"</li>
                  <li>Tap "Link a Device"</li>
                  <li>Point your phone at this screen to scan the code</li>
                </ol>
              </div>

              <Button 
                variant="outline" 
                className="mt-6"
                onClick={() => {
                  setShowQR(false)
                  setQrCode(null)
                  setQrExpiryTime(null)
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessions List */}
      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 className="h-12 w-12 text-gray-400 animate-spin mx-auto mb-3" />
                <p className="text-gray-600">Loading sessions...</p>
              </div>
            </CardContent>
          </Card>
        ) : sessions.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <QrCode className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No WhatsApp Numbers Connected</h3>
              <p className="text-gray-600 mb-6 text-center max-w-md">
                Connect your first WhatsApp business number to start managing conversations
              </p>
              <Button onClick={handleAddSession} size="lg" className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First WhatsApp Number
              </Button>
            </CardContent>
          </Card>
        ) : (
          sessions.map((session) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <Smartphone className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {session.phone_number || 'Connecting...'}
                        </h3>
                        {getStatusBadge(session.status)}
                      </div>
                      <p className="text-sm text-gray-600">
                        Added {new Date(session.created_at).toLocaleDateString()}
                        {session.last_activity && (
                          <> • Last active {new Date(session.last_activity).toLocaleTimeString()}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {(session.status === 'disconnected' || session.status === 'connecting') && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleReconnect(session.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Reconnect
                      </Button>
                    )}
                    {session.status === 'connected' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleForceDisconnect(session.id)}
                        className="border-orange-600 text-orange-600 hover:bg-orange-50"
                      >
                        Disconnect
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteSession(session.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Delete phone number and session"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Refresh Button */}
      {sessions.length > 0 && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={fetchSessions} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
        </div>
      )}
    </div>
  )
}
