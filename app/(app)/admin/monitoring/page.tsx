'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Activity, AlertCircle, CheckCircle, Clock, MessageSquare, Phone, TrendingUp, Zap } from 'lucide-react'
import { PermissionGuard } from '@/lib/rbac/components/PermissionGuard';

interface MonitoringData {
  apiStatus: 'connected' | 'error' | 'unknown'
  sessions: Array<{
    id: string
    phone_number: string
    session_name: string
    status: string
    meta_phone_number_id: string | null
    updated_at: string
  }>
  messageStats: {
    sent: number
    delivered: number
    read: number
    failed: number
  }
}

export default function MonitoringPage() {
  const [data, setData] = useState<MonitoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = async () => {
    try {
      // Fetch sessions and Meta API status in parallel
      const [sessionsRes, metaStatusRes] = await Promise.all([
        fetch('/api/whatsapp/sessions'),
        fetch('/api/whatsapp/meta-status'),
      ])

      const sessionsData = sessionsRes.ok ? await sessionsRes.json() : { sessions: [] }
      const metaData = metaStatusRes.ok ? await metaStatusRes.json() : null

      // Fetch message stats from Supabase via stats API
      const statsRes = await fetch('/api/whatsapp/sessions/stats')
      const statsData = statsRes.ok ? await statsRes.json() : { stats: {} }

      setData({
        apiStatus: metaData?.phone_number ? 'connected' : 'error',
        sessions: sessionsData.sessions || [],
        messageStats: {
          sent: statsData.stats?.active || 0,
          delivered: 0,
          read: 0,
          failed: statsData.stats?.inactive || 0,
        },
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading metrics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load monitoring data: {error}
        </AlertDescription>
      </Alert>
    )
  }

  if (!data) return null

  return (
    <PermissionGuard 
      permission={['admin.access']}
      fallback={
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Anda tidak memiliki akses ke halaman ini.</p>
        </div>
      }
    >
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Monitoring</h1>
        <p className="text-muted-foreground">Meta WhatsApp Cloud API & Service Health</p>
      </div>

      {/* API Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Meta Cloud API Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className={`h-4 w-4 rounded-full ${data.apiStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-2xl font-bold capitalize">{data.apiStatus}</span>
            <Badge variant="outline" className="ml-auto">
              <Clock className="h-3 w-3 mr-1" />
              API v21.0
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Numbers</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.sessions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data.sessions.filter(s => s.status === 'connected').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Meta ID</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.sessions.filter(s => s.meta_phone_number_id).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disconnected</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {data.sessions.filter(s => s.status === 'disconnected').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Registered Numbers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Registered WhatsApp Numbers
          </CardTitle>
          <CardDescription>Numbers connected via Meta Business Cloud API</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{session.session_name || session.phone_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {session.phone_number}
                    {session.meta_phone_number_id && ` | Meta ID: ${session.meta_phone_number_id}`}
                  </p>
                </div>
                <Badge variant={session.status === 'connected' ? 'default' : 'secondary'}>
                  {session.status}
                </Badge>
              </div>
            ))}
            {data.sessions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No registered numbers</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Architecture Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Architecture
          </CardTitle>
          <CardDescription>Current system configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="p-3 border rounded-lg">
              <p className="text-sm font-medium">WhatsApp API</p>
              <p className="text-sm text-muted-foreground">Meta Business Cloud API v21.0</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="text-sm font-medium">Hosting</p>
              <p className="text-sm text-muted-foreground">Vercel Serverless</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="text-sm font-medium">Database</p>
              <p className="text-sm text-muted-foreground">Supabase PostgreSQL</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="text-sm font-medium">Real-time</p>
              <p className="text-sm text-muted-foreground">Supabase Realtime</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="text-sm font-medium">Cache</p>
              <p className="text-sm text-muted-foreground">Upstash Redis (Serverless)</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="text-sm font-medium">Background Jobs</p>
              <p className="text-sm text-muted-foreground">Vercel Cron</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </PermissionGuard>
  )
}
