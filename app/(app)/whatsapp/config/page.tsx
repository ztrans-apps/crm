'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/lib/stores/toast-store'
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Phone,
  Key,
  Webhook,
  Shield
} from 'lucide-react'

interface WhatsAppSession {
  id: string
  phone_number: string
  session_name: string
  meta_phone_number_id: string | null
  meta_api_token: string | null
  meta_api_version: string
  meta_business_account_id: string | null
  meta_webhook_verify_token: string | null
  status: 'connected' | 'disconnected' | 'connecting'
  is_active: boolean
}

export default function WhatsAppConfigPage() {
  const [sessions, setSessions] = useState<WhatsAppSession[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSession, setEditingSession] = useState<WhatsAppSession | null>(null)
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/whatsapp/sessions')
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions || [])
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleShowToken = (sessionId: string) => {
    setShowTokens(prev => ({
      ...prev,
      [sessionId]: !prev[sessionId]
    }))
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Settings className="h-8 w-8 text-vx-purple" />
              <h1 className="text-3xl font-bold">WhatsApp Configuration</h1>
            </div>
            <p className="text-vx-text-muted">
              Manage Meta API credentials and WhatsApp Business numbers
            </p>
          </div>
          <Button onClick={() => setEditingSession({} as WhatsAppSession)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Number
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="mb-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Database-Driven Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 dark:text-blue-200 space-y-2 text-sm">
          <p>✓ All Meta API credentials stored securely in database</p>
          <p>✓ No need to edit .env file for each number</p>
          <p>✓ Easy to manage multiple WhatsApp Business numbers</p>
          <p>✓ Per-tenant isolation and security</p>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <div className="grid gap-6">
        {loading ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-vx-text-muted">Loading...</p>
            </CardContent>
          </Card>
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <Phone className="h-12 w-12 text-vx-text-muted mx-auto mb-4" />
                <p className="text-vx-text-muted mb-4">No WhatsApp numbers configured</p>
                <Button onClick={() => setEditingSession({} as WhatsAppSession)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Number
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          sessions.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              showToken={showTokens[session.id]}
              onToggleToken={() => toggleShowToken(session.id)}
              onEdit={() => setEditingSession(session)}
              onRefresh={fetchSessions}
            />
          ))
        )}
      </div>

      {/* Edit Modal */}
      {editingSession && (
        <EditSessionModal
          session={editingSession}
          onClose={() => setEditingSession(null)}
          onSave={() => {
            setEditingSession(null)
            fetchSessions()
          }}
        />
      )}
    </div>
  )
}

// Session Card Component
function SessionCard({ 
  session, 
  showToken, 
  onToggleToken, 
  onEdit,
  onRefresh
}: { 
  session: WhatsAppSession
  showToken: boolean
  onToggleToken: () => void
  onEdit: () => void
  onRefresh: () => void
}) {
  const [updating, setUpdating] = useState(false)

  const toggleActive = async () => {
    setUpdating(true)
    try {
      const response = await fetch(`/api/whatsapp/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !session.is_active })
      })

      if (response.ok) {
        toast.success('Session updated', 'Success')
        onRefresh()
      } else {
        toast.error('Failed to update session', 'Error')
      }
    } catch (error) {
      toast.error('Error updating session', 'Error')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <CardTitle>{session.session_name}</CardTitle>
              <Badge variant={session.status === 'connected' ? 'default' : 'secondary'}>
                {session.status}
              </Badge>
              {session.is_active ? (
                <Badge className="bg-green-500">Active</Badge>
              ) : (
                <Badge variant="outline">Inactive</Badge>
              )}
            </div>
            <CardDescription className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {session.phone_number}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={session.is_active}
              onCheckedChange={toggleActive}
              disabled={updating}
            />
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="api">API Config</TabsTrigger>
            <TabsTrigger value="webhook">Webhook</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-3">
            <ConfigItem
              label="Phone Number ID"
              value={session.meta_phone_number_id}
              icon={<Phone className="h-4 w-4" />}
            />
            <ConfigItem
              label="API Version"
              value={session.meta_api_version}
              icon={<Settings className="h-4 w-4" />}
            />
            <ConfigItem
              label="Business Account ID"
              value={session.meta_business_account_id}
              icon={<Shield className="h-4 w-4" />}
            />
          </TabsContent>

          <TabsContent value="api" className="space-y-3">
            <ConfigItem
              label="API Token"
              value={session.meta_api_token}
              icon={<Key className="h-4 w-4" />}
              sensitive
              show={showToken}
              onToggle={onToggleToken}
            />
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm">
              <p className="text-yellow-900 dark:text-yellow-100 font-semibold mb-1">
                Security Note
              </p>
              <p className="text-yellow-800 dark:text-yellow-200 text-xs">
                API tokens are sensitive. Never share them publicly.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="webhook" className="space-y-3">
            <ConfigItem
              label="Webhook Verify Token"
              value={session.meta_webhook_verify_token}
              icon={<Webhook className="h-4 w-4" />}
              sensitive
              show={showToken}
              onToggle={onToggleToken}
            />
            <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
              <p className="text-blue-900 dark:text-blue-100 font-semibold mb-1">
                Webhook URL
              </p>
              <code className="text-blue-800 dark:text-blue-200 text-xs">
                {typeof window !== 'undefined' ? window.location.origin : ''}/api/whatsapp/webhook
              </code>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// Config Item Component
function ConfigItem({
  label,
  value,
  icon,
  sensitive = false,
  show = false,
  onToggle
}: {
  label: string
  value: string | null
  icon: React.ReactNode
  sensitive?: boolean
  show?: boolean
  onToggle?: () => void
}) {
  const displayValue = value || 'Not configured'
  const maskedValue = value ? '••••••••••••••••' : 'Not configured'

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-vx-text-muted font-mono">
            {sensitive && !show ? maskedValue : displayValue}
          </p>
        </div>
      </div>
      {sensitive && value && onToggle && (
        <Button variant="ghost" size="sm" onClick={onToggle}>
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      )}
      {value ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-red-500" />
      )}
    </div>
  )
}

// Edit Session Modal Component (placeholder)
function EditSessionModal({
  session,
  onClose,
  onSave
}: {
  session: WhatsAppSession
  onClose: () => void
  onSave: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>
            {session.id ? 'Edit' : 'Add'} WhatsApp Number
          </CardTitle>
          <CardDescription>
            Configure Meta API credentials for this number
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-vx-text-muted">
            Form implementation here...
          </p>
          <div className="flex gap-2 mt-4">
            <Button onClick={onSave}>Save</Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
