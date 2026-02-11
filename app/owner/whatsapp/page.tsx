// app/owner/whatsapp/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { QrCode, Smartphone, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react'
import { io, Socket } from 'socket.io-client'

export default function WhatsAppPage() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [sessionName, setSessionName] = useState('')
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [connectingSession, setConnectingSession] = useState<string | null>(null)
  const socketRef = useRef<Socket | null>(null)

  // Dialog states
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => void
    confirmText?: string
    variant?: 'default' | 'destructive'
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
    confirmText: 'Confirm',
    variant: 'default'
  })

  const [alertDialog, setAlertDialog] = useState<{
    open: boolean
    title: string
    description: string
    variant?: 'default' | 'destructive'
  }>({
    open: false,
    title: '',
    description: '',
    variant: 'default'
  })

  const supabase = createClient()
  const serviceUrl = process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL || 'http://localhost:3001'

  useEffect(() => {
    loadSessions()
    
    // Initialize Socket.IO
    socketRef.current = io(serviceUrl)
    
    socketRef.current.on('qr', (data: { sessionId: string; qr: string }) => {
      console.log('QR received:', data.sessionId)
      setQrCode(data.qr)
    })
    
    socketRef.current.on('ready', (data: { sessionId: string }) => {
      console.log('WhatsApp ready:', data.sessionId)
      setQrCode(null)
      setConnectingSession(null)
      loadSessions()
    })
    
    socketRef.current.on('disconnected', (data: { sessionId: string }) => {
      console.log('WhatsApp disconnected:', data.sessionId)
      loadSessions()
    })

    return () => {
      socketRef.current?.disconnect()
    }
  }, [])

  const loadSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user profile to check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      // Owner can see all sessions, agents only see their own
      let query = supabase
        .from('whatsapp_sessions')
        .select('*')
        .order('created_at', { ascending: false })

      // If not owner, filter by user_id
      // @ts-ignore
      if (profile?.role !== 'owner') {
        query = query.eq('user_id', user.id)
      }

      const { data } = await query

      if (data) setSessions(data)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleConnect = async () => {
    if (!phoneNumber || !sessionName) {
      setAlertDialog({
        open: true,
        title: 'Missing Information',
        description: 'Please fill in both phone number and session name.',
        variant: 'default'
      })
      return
    }

    setLoading(true)
    setQrCode(null)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Ensure profile exists first
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!profile) {
        // Create profile if doesn't exist
        // @ts-ignore - Supabase types issue
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
            role: 'owner'
          })

        if (profileError) {
          console.error('Profile creation error:', profileError)
          // Continue anyway, might already exist
        }
      }

      // Generate UUID for session
      const sessionId = crypto.randomUUID()

      // Save to database
      // @ts-ignore - Supabase types issue
      const { error: dbError } = await supabase
        .from('whatsapp_sessions')
        .insert({
          id: sessionId,
          user_id: user.id,
          session_name: sessionName,
          phone_number: phoneNumber,
          status: 'connecting'
        })

      if (dbError) {
        throw new Error('Failed to save session: ' + dbError.message)
      }

      // Then generate QR via WhatsApp Service
      const response = await fetch(`${serviceUrl}/api/whatsapp/generate-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId,
          phoneNumber: phoneNumber,
          userId: user.id
        })
      })

      let result
      try {
        result = await response.json()
      } catch (parseError) {
        throw new Error(`Server error (${response.status}): Unable to parse response. Service may be down.`)
      }
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to generate QR')
      }

      setConnectingSession(sessionName)
      setPhoneNumber('')
      setSessionName('')
      
      setTimeout(loadSessions, 2000)
    } catch (error: any) {
      console.error('QR Generation error:', error)
      setAlertDialog({
        open: true,
        title: 'Connection Failed',
        description: error.message || 'Failed to generate QR code. Please check if WhatsApp service is running.',
        variant: 'destructive'
      })
      setQrCode(null)
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async (sessionId: string) => {
    setConfirmDialog({
      open: true,
      title: 'Disconnect Session',
      description: 'Are you sure you want to disconnect this WhatsApp session? You can reconnect it later.',
      confirmText: 'Disconnect',
      variant: 'destructive',
      onConfirm: async () => {
        await performDisconnect(sessionId)
      }
    })
  }

  const performDisconnect = async (sessionId: string) => {
    try {
      // Delete from WhatsApp Service
      const response = await fetch(`${serviceUrl}/api/whatsapp/sessions/${sessionId}`, {
        method: 'DELETE'
      })

      let result
      try {
        result = await response.json()
      } catch (parseError) {
        throw new Error(`Server error (${response.status}): Unable to parse response. Service may be down.`)
      }
      
      if (result.success) {
        // Also delete from database
        const { error } = await supabase
          .from('whatsapp_sessions')
          .delete()
          .eq('id', sessionId)

        if (error) {
          console.error('Error deleting from database:', error)
        }

        loadSessions()
      } else {
        setAlertDialog({
          open: true,
          title: 'Disconnect Failed',
          description: 'Failed to disconnect: ' + (result.message || result.error || 'Unknown error'),
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      console.error('Disconnect error:', error)
      setAlertDialog({
        open: true,
        title: 'Error',
        description: error.message || 'An error occurred while disconnecting',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteDevice = async (sessionId: string) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Device',
      description: 'Are you sure you want to delete this device permanently? This will remove all authentication data and cannot be undone. You will need to scan QR code again to reconnect.',
      confirmText: 'Delete Device',
      variant: 'destructive',
      onConfirm: async () => {
        await performDeleteDevice(sessionId)
      }
    })
  }

  const performDeleteDevice = async (sessionId: string) => {
    try {
      // Force delete from WhatsApp Service (including auth files)
      const response = await fetch(`${serviceUrl}/api/whatsapp/sessions/${sessionId}/force`, {
        method: 'DELETE'
      })

      let result
      try {
        result = await response.json()
      } catch (parseError) {
        // If JSON parse fails, show generic error
        throw new Error(`Server error (${response.status}): Unable to connect to WhatsApp service. Please check if service is running.`)
      }
      
      if (result.success) {
        setAlertDialog({
          open: true,
          title: 'Device Deleted',
          description: 'Device deleted successfully. You can now connect a new device.',
          variant: 'default'
        })
        loadSessions()
      } else {
        setAlertDialog({
          open: true,
          title: 'Delete Failed',
          description: 'Failed to delete device: ' + (result.message || result.error || 'Unknown error'),
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      console.error('Delete device error:', error)
      setAlertDialog({
        open: true,
        title: 'Error',
        description: error.message || 'An error occurred while deleting device',
        variant: 'destructive'
      })
    }
  }

  const handleUpdateStatus = async (sessionId: string, newStatus: string) => {
    try {
      // @ts-ignore
      const { error } = await supabase
        .from('whatsapp_sessions')
        .update({ status: newStatus })
        .eq('id', sessionId)

      if (error) {
        console.error('Error updating status:', error)
        setAlertDialog({
          open: true,
          title: 'Update Failed',
          description: error.message || 'Failed to update status',
          variant: 'destructive'
        })
      } else {
        console.log('Status updated to:', newStatus)
        setAlertDialog({
          open: true,
          title: 'Status Updated',
          description: `Session status updated to ${newStatus}`,
          variant: 'default'
        })
        loadSessions()
      }
    } catch (error: any) {
      console.error('Update status error:', error)
      setAlertDialog({
        open: true,
        title: 'Error',
        description: error.message || 'An error occurred while updating status',
        variant: 'destructive'
      })
    }
  }

  const handleReconnect = async (sessionId: string) => {
    try {
      console.log('Reconnecting session:', sessionId)
      
      const response = await fetch(`${serviceUrl}/api/whatsapp/reconnect/${sessionId}`, {
        method: 'POST'
      })

      let result
      try {
        result = await response.json()
      } catch (parseError) {
        throw new Error(`Server error (${response.status}): Unable to parse response. Service may be down.`)
      }
      
      if (result.success) {
        console.log('Reconnect initiated:', result)
        setAlertDialog({
          open: true,
          title: 'Reconnecting',
          description: 'Session reconnection initiated. Please wait...',
          variant: 'default'
        })
        setTimeout(loadSessions, 2000)
      } else {
        setAlertDialog({
          open: true,
          title: 'Reconnect Failed',
          description: 'Failed to reconnect: ' + (result.error || result.message || 'Unknown error'),
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      console.error('Reconnect error:', error)
      setAlertDialog({
        open: true,
        title: 'Error',
        description: error.message || 'An error occurred while reconnecting',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">WhatsApp Connection</h1>
        <p className="text-gray-600 mt-1">Connect your WhatsApp account</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Connect New WhatsApp</CardTitle>
            <CardDescription>Add your WhatsApp number</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="+628123456789"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session">Session Name</Label>
              <Input
                id="session"
                placeholder="my-whatsapp"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button onClick={handleConnect} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating QR...
                </>
              ) : (
                <>
                  <QrCode className="mr-2 h-4 w-4" />
                  Connect WhatsApp
                </>
              )}
            </Button>

            {qrCode && (
              <div className="mt-4 p-4 border rounded-lg bg-white">
                <p className="text-sm text-gray-600 mb-3 text-center">
                  Scan this QR code with WhatsApp
                </p>
                <img 
                  src={qrCode} 
                  alt="QR Code" 
                  className="w-full max-w-[300px] mx-auto"
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  QR code expires in 60 seconds
                </p>
              </div>
            )}

            {connectingSession && !qrCode && (
              <div className="mt-4 p-4 border rounded-lg bg-blue-50 text-center">
                <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-blue-600" />
                <p className="text-sm text-blue-600">
                  Waiting for QR code...
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Sessions</CardTitle>
            <CardDescription>Your connected accounts</CardDescription>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Smartphone className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No sessions yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{session.session_name}</p>
                      <p className="text-sm text-gray-600">{session.phone_number}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Status: <span className={
                          session.status === 'active' || session.status === 'connected' ? 'text-green-600' : 
                          session.status === 'connecting' ? 'text-yellow-600' : 
                          'text-gray-600'
                        }>
                          {session.status === 'active' || session.status === 'connected' ? 'Connected' : 
                           session.status === 'connecting' ? 'Connecting...' : 
                           'Disconnected'}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {session.status === 'active' || session.status === 'connected' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : session.status === 'connecting' ? (
                        <Loader2 className="h-5 w-5 text-yellow-600 animate-spin" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400" />
                      )}
                      
                      {/* Reconnect button for connected sessions */}
                      {(session.status === 'connected' || session.status === 'active') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReconnect(session.id)}
                          className="text-xs"
                        >
                          Reconnect
                        </Button>
                      )}
                      
                      {/* Debug: Manual status update for stuck "connecting" */}
                      {session.status === 'connecting' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUpdateStatus(session.id, 'connected')}
                            className="text-xs"
                          >
                            Force Connected
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteDevice(session.id)}
                            className="text-xs"
                          >
                            Delete Device
                          </Button>
                        </>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(session.id)}
                        disabled={session.status === 'connecting'}
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmDialog.variant === 'destructive' && (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              {confirmDialog.title}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
            >
              Cancel
            </Button>
            <Button
              variant={confirmDialog.variant}
              onClick={() => {
                confirmDialog.onConfirm()
                setConfirmDialog({ ...confirmDialog, open: false })
              }}
            >
              {confirmDialog.confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog */}
      <Dialog open={alertDialog.open} onOpenChange={(open) => setAlertDialog({ ...alertDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {alertDialog.variant === 'destructive' && (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              {alertDialog.title}
            </DialogTitle>
            <DialogDescription>
              {alertDialog.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAlertDialog({ ...alertDialog, open: false })}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
