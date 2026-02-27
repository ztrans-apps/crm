'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ConversationEffectivenessProps {
  dateRange: 'today' | 'week' | 'month'
  customDates?: { start?: Date; end?: Date }
}

interface EffectivenessData {
  conversationsPerAgent: Array<{
    agentId: string
    agentName: string
    count: number
    avgResponseTime: number
  }>
  avgResponseTimeOverTime: Array<{
    timestamp: string
    avgSeconds: number
  }>
  slaCompliance: {
    percentage: number
    compliant: number
    nonCompliant: number
  }
  resolvedVsOpen: {
    resolved: number
    open: number
    percentage: number
  }
}

export function ConversationEffectiveness({ dateRange, customDates }: ConversationEffectivenessProps) {
  const [data, setData] = useState<EffectivenessData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const params = new URLSearchParams({ dateRange })
        if (customDates?.start) params.append('startDate', customDates.start.toISOString())
        if (customDates?.end) params.append('endDate', customDates.end.toISOString())
        
        const response = await fetch(`/api/dashboard/conversation-effectiveness?${params}`)
        if (!response.ok) throw new Error('Failed to fetch')
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error('Error fetching conversation effectiveness:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [dateRange, customDates])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Efektivitas Percakapan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 animate-pulse bg-vx-surface-hover rounded" />
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const pieData = [
    { name: 'Terselesaikan', value: data.resolvedVsOpen.resolved, color: '#10b981' },
    { name: 'Terbuka', value: data.resolvedVsOpen.open, color: '#f59e0b' }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Efektivitas Percakapan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Conversations per Agent */}
        <div>
          <h3 className="mb-4 text-sm font-medium">Percakapan per Agen</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.conversationsPerAgent}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="agentName" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3b82f6" name="Jumlah Percakapan" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Response Time Over Time */}
        <div>
          <h3 className="mb-4 text-sm font-medium">Waktu Respons Rata-rata</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.avgResponseTimeOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avgSeconds" stroke="#8b5cf6" name="Detik" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* SLA Compliance & Resolved vs Open */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-4 text-sm font-medium">Kepatuhan SLA</h3>
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-bold text-vx-teal">
                  {data.slaCompliance.percentage}%
                </div>
                <p className="mt-2 text-sm text-vx-text-secondary">
                  {data.slaCompliance.compliant} dari {data.slaCompliance.compliant + data.slaCompliance.nonCompliant} percakapan
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-medium">Status Percakapan</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
