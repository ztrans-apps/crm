// app/owner/agents/components/AgentListTab.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, Mail, User } from 'lucide-react'

interface Agent {
  id: string
  email: string
  full_name: string
  agent_status: string
  active_chats_count: number
  max_concurrent_chats: number
  created_at: string
}

export default function AgentListTab() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadAgents()
  }, [])

  const loadAgents = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // Dynamic: find agent user IDs via user_roles → permissions
      const { data: roleUsers } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          roles!inner (
            role_permissions!inner (
              permissions!inner (
                permission_key
              )
            )
          )
        `)
      const agentIds: string[] = []
      for (const ur of (roleUsers || [])) {
        const role = (ur as any).roles
        if (!role?.role_permissions) continue
        for (const rp of role.role_permissions) {
          if (rp.permissions?.permission_key === 'chat.send') {
            agentIds.push((ur as any).user_id)
            break
          }
        }
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, agent_status, active_chats_count, max_concurrent_chats, created_at')
        .in('id', agentIds.length > 0 ? agentIds : ['__none__'])
        .order('full_name')

      if (error) throw error
      setAgents(data || [])
    } catch (error) {
      console.error('Error loading agents:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-vx-teal/10 text-vx-teal'
      case 'busy':
        return 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
      case 'offline':
        return 'bg-vx-surface-hover text-vx-text-secondary'
      default:
        return 'bg-vx-surface-hover text-vx-text-secondary'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>All Agents</CardTitle>
            <CardDescription>
              List of all agents in the system
            </CardDescription>
          </div>
          <Button
            onClick={loadAgents}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-vx-surface-hover transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                  {agent.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-vx-text">{agent.full_name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(agent.agent_status)}`}>
                      {agent.agent_status || 'offline'}
                    </span>
                  </div>
                  <p className="text-sm text-vx-text-muted flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {agent.email}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-vx-text">
                  {agent.active_chats_count || 0} / {agent.max_concurrent_chats || 5}
                </p>
                <p className="text-xs text-vx-text-muted">Active Chats</p>
              </div>
            </div>
          ))}
          {agents.length === 0 && !loading && (
            <p className="text-center text-vx-text-muted py-8">No agents found</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
