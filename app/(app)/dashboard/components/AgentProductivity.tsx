'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AgentProductivityProps {
  dateRange: 'today' | 'week' | 'month'
}

interface AgentProductivityData {
  agentMetrics: Array<{
    agentId: string
    agentName: string
    chatsHandled: number
    resolutionRate: number
    idleTime: number
    activeTime: number
    avgHandlingTime: number
    status: 'online' | 'away' | 'offline'
    statusDuration: number
  }>
  workloadDistribution: {
    balanced: number
    overloaded: number
    underutilized: number
  }
}

export function AgentProductivity({ dateRange }: AgentProductivityProps) {
  const [data, setData] = useState<AgentProductivityData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/dashboard/agent-productivity?period=${dateRange}`)
        if (!response.ok) throw new Error('Failed to fetch')
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error('Error fetching agent productivity:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [dateRange])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Produktivitas Agen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 animate-pulse bg-vx-surface-hover rounded" />
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const statusColors = {
    online: 'text-green-500',
    away: 'text-yellow-500',
    offline: 'text-vx-text-muted'
  }

  const statusLabels = {
    online: 'Online',
    away: 'Away',
    offline: 'Offline'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Produktivitas Agen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Workload Distribution */}
        <div>
          <h3 className="mb-4 text-sm font-medium">Distribusi Beban Kerja</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-vx-teal/10 p-4">
              <p className="text-sm text-vx-text-secondary">Seimbang</p>
              <p className="text-2xl font-bold text-vx-teal">{data.workloadDistribution.balanced}</p>
            </div>
            <div className="rounded-lg bg-red-50 p-4 dark:bg-red-950">
              <p className="text-sm text-vx-text-secondary">Overload</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{data.workloadDistribution.overloaded}</p>
            </div>
            <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-950">
              <p className="text-sm text-vx-text-secondary">Underutilized</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{data.workloadDistribution.underutilized}</p>
            </div>
          </div>
        </div>

        {/* Agent Metrics Table */}
        <div>
          <h3 className="mb-4 text-sm font-medium">Metrik per Agen</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="pb-2 font-medium">Agen</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium text-right">Chat</th>
                  <th className="pb-2 font-medium text-right">Resolusi</th>
                  <th className="pb-2 font-medium text-right">Waktu Aktif</th>
                  <th className="pb-2 font-medium text-right">Avg Handling</th>
                </tr>
              </thead>
              <tbody>
                {data.agentMetrics.map(agent => (
                  <tr key={agent.agentId} className="border-b last:border-0">
                    <td className="py-3">{agent.agentName}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Circle className={cn('h-3 w-3 fill-current', statusColors[agent.status])} />
                        <span className="text-xs">{statusLabels[agent.status]}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right font-medium">{agent.chatsHandled}</td>
                    <td className="py-3 text-right">
                      <span className={cn(
                        'font-medium',
                        agent.resolutionRate >= 80 ? 'text-vx-teal' : 
                        agent.resolutionRate >= 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                      )}>
                        {agent.resolutionRate}%
                      </span>
                    </td>
                    <td className="py-3 text-right">{formatDuration(agent.activeTime)}</td>
                    <td className="py-3 text-right">{formatDuration(agent.avgHandlingTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
