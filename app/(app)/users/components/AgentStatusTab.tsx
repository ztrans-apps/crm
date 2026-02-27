// app/owner/agents/components/AgentStatusTab.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RefreshCw, Power } from 'lucide-react'
import { usePermissions } from '@/lib/rbac'

interface Agent {
  id: string
  email: string
  full_name: string
  agent_status: string
  last_activity: string | null
  updated_at: string
}

export default function AgentStatusTab() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(false)
  const [resetting, setResetting] = useState(false)
  const { hasPermission } = usePermissions()

  useEffect(() => {
    loadAgents()
  }, [])

  const loadAgents = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, agent_status, last_activity, updated_at')
        .eq('role', 'agent')
        .order('email')

      if (error) throw error
      setAgents(data || [])
    } catch (error) {
      console.error('Error loading agents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResetAll = async () => {
    if (!confirm('Reset semua agent status ke offline?')) return

    setResetting(true)
    try {
      const response = await fetch('/api/admin/reset-agent-status', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to reset')
      }

      alert('Berhasil reset semua agent status!')
      loadAgents()
    } catch (error) {
      console.error('Error resetting:', error)
      alert('Gagal reset agent status')
    } finally {
      setResetting(false)
    }
  }

  const handleManualUpdate = async (agentId: string, status: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/debug-agent-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentId, status }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update')
      }

      alert('Berhasil update agent status!')
      loadAgents()
    } catch (error: any) {
      console.error('Error updating:', error)
      alert('Gagal update: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string, lastActivity: string | null) => {
    const isTrulyOnline = lastActivity && 
      (new Date().getTime() - new Date(lastActivity).getTime()) < 2 * 60 * 1000

    if (status === 'available' && isTrulyOnline) {
      return 'bg-vx-teal/10 text-vx-teal'
    } else if (status === 'busy' && isTrulyOnline) {
      return 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
    } else {
      return 'bg-vx-surface-hover text-vx-text-secondary'
    }
  }

  const getStatusLabel = (status: string, lastActivity: string | null) => {
    const isTrulyOnline = lastActivity && 
      (new Date().getTime() - new Date(lastActivity).getTime()) < 2 * 60 * 1000

    if (!isTrulyOnline) {
      return 'offline (inactive)'
    }
    return status
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Online Status Monitor</CardTitle>
              <CardDescription>
                Agent dianggap online jika last activity dalam 2 menit terakhir.
                Hanya agent online yang muncul di assignment dropdown.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={loadAgents}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {hasPermission('agent.status.manage') && (
                <Button
                  onClick={handleResetAll}
                  disabled={resetting}
                  variant="destructive"
                  size="sm"
                >
                  <Power className="h-4 w-4 mr-2" />
                  Reset All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">{agent.full_name}</p>
                  <p className="text-sm text-vx-text-muted">{agent.email}</p>
                  <p className="text-xs text-vx-text-muted mt-1">
                    Last activity: {agent.last_activity 
                      ? new Date(agent.last_activity).toLocaleString() 
                      : 'Never'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(agent.agent_status, agent.last_activity)}`}>
                    {getStatusLabel(agent.agent_status, agent.last_activity)}
                  </span>
                  {hasPermission('agent.status.manage') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleManualUpdate(agent.id, 'offline')}
                      disabled={loading}
                    >
                      Set Offline
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {agents.length === 0 && !loading && (
              <p className="text-center text-vx-text-muted py-8">No agents found</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Info</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-vx-text-secondary space-y-2">
          <p>• Agent status otomatis update setiap 30 detik (heartbeat system)</p>
          <p>• Agent dianggap online jika last activity kurang dari 2 menit</p>
          <p>• Gunakan "Set Offline" untuk manual set agent ke offline</p>
          <p>• Gunakan "Reset All" untuk reset semua agent ke offline</p>
        </CardContent>
      </Card>
    </div>
  )
}
