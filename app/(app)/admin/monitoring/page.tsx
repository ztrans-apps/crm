'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Activity, AlertCircle, CheckCircle, Clock, MessageSquare, TrendingUp, Zap } from 'lucide-react'

interface HealthMetrics {
  status: 'healthy' | 'degraded' | 'unhealthy'
  uptime: number
  operations: {
    total: number
    successful: number
    failed: number
    successRate: number
  }
  sessions: Record<string, string>
  circuitBreakers: Record<string, {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
    failures: number
    lastFailure: number | null
  }>
  deliveryStats: {
    sent: number
    delivered: number
    read: number
    failed: number
  }
  recentOperations: Array<{
    name: string
    success: boolean
    timestamp: number
  }>
}

export default function MonitoringPage() {
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL || 'http://localhost:3001'}/api/health/metrics`)
      if (!response.ok) throw new Error('Failed to fetch metrics')
      const data = await response.json()
      setMetrics(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 5000) // Refresh every 5 seconds
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

  if (!metrics) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500'
      case 'degraded': return 'bg-yellow-500'
      case 'unhealthy': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getCircuitBreakerColor = (state: string) => {
    switch (state) {
      case 'CLOSED': return 'success'
      case 'HALF_OPEN': return 'warning'
      case 'OPEN': return 'destructive'
      default: return 'secondary'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">WhatsApp Service Monitoring</h1>
        <p className="text-muted-foreground">Real-time health and performance metrics</p>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Service Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className={`h-4 w-4 rounded-full ${getStatusColor(metrics.status)}`} />
            <span className="text-2xl font-bold capitalize">{metrics.status}</span>
            <Badge variant="outline" className="ml-auto">
              <Clock className="h-3 w-3 mr-1" />
              Uptime: {Math.floor(metrics.uptime / 1000 / 60)} minutes
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Operations Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Operations</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.operations.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.operations.successful}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.operations.failed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.operations.successRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Delivery Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Message Delivery Stats
          </CardTitle>
          <CardDescription>Last 24 hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Sent</p>
              <p className="text-2xl font-bold">{metrics.deliveryStats.sent}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Delivered</p>
              <p className="text-2xl font-bold text-blue-600">{metrics.deliveryStats.delivered}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Read</p>
              <p className="text-2xl font-bold text-green-600">{metrics.deliveryStats.read}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold text-red-600">{metrics.deliveryStats.failed}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Circuit Breakers */}
      <Card>
        <CardHeader>
          <CardTitle>Circuit Breakers</CardTitle>
          <CardDescription>Protection status for critical operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(metrics.circuitBreakers).map(([name, breaker]) => (
              <div key={name} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{name}</p>
                  <p className="text-sm text-muted-foreground">
                    Failures: {breaker.failures}
                    {breaker.lastFailure && ` • Last: ${new Date(breaker.lastFailure).toLocaleTimeString()}`}
                  </p>
                </div>
                <Badge variant={getCircuitBreakerColor(breaker.state) as any}>
                  {breaker.state}
                </Badge>
              </div>
            ))}
            {Object.keys(metrics.circuitBreakers).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No circuit breakers active</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>WhatsApp session status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(metrics.sessions).map(([sessionId, status]) => (
              <div key={sessionId} className="flex items-center justify-between p-3 border rounded-lg">
                <p className="font-medium">{sessionId}</p>
                <Badge variant={status === 'connected' ? 'default' : 'secondary'}>
                  {status}
                </Badge>
              </div>
            ))}
            {Object.keys(metrics.sessions).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No active sessions</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Operations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Operations</CardTitle>
          <CardDescription>Last 10 operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {metrics.recentOperations.slice(0, 10).map((op, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 border-b last:border-0">
                <div className="flex items-center gap-2">
                  {op.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">{op.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(op.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
            {metrics.recentOperations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No recent operations</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
