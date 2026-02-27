'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Bot, TrendingUp } from 'lucide-react'

interface AutomationImpactData {
  chatbotVsHuman: {
    chatbot: number
    human: number
    percentage: number
  }
  autoReplySuccess: {
    total: number
    successful: number
    percentage: number
  }
  dropOffRate: {
    total: number
    dropped: number
    percentage: number
  }
  topIntents: Array<{
    intent: string
    count: number
    successRate: number
  }>
  timeSaved: {
    hours: number
    estimatedCost: number
  }
  escalationRate: {
    total: number
    escalated: number
    percentage: number
  }
}

export function AutomationImpact() {
  const [data, setData] = useState<AutomationImpactData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/dashboard/automation-impact')
        if (!response.ok) throw new Error('Failed to fetch')
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error('Error fetching automation impact:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dampak Otomasi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 animate-pulse bg-vx-surface-hover rounded" />
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const pieData = [
    { name: 'Chatbot', value: data.chatbotVsHuman.chatbot, color: '#8b5cf6' },
    { name: 'Human', value: data.chatbotVsHuman.human, color: '#3b82f6' }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dampak Otomasi</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Chatbot vs Human */}
        <div>
          <h3 className="mb-4 text-sm font-medium">Chatbot vs Human</h3>
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

        {/* Auto-reply Success */}
        <div>
          <h3 className="mb-4 text-sm font-medium">Tingkat Keberhasilan Auto-reply</h3>
          <div className="rounded-lg bg-vx-purple/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-vx-purple">{data.autoReplySuccess.percentage}%</p>
                <p className="text-sm text-vx-text-secondary">
                  {data.autoReplySuccess.successful} dari {data.autoReplySuccess.total} berhasil
                </p>
              </div>
              <Bot className="h-12 w-12 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Time Saved */}
        <div>
          <h3 className="mb-4 text-sm font-medium">Waktu yang Dihemat</h3>
          <div className="rounded-lg bg-vx-teal/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-vx-teal">{data.timeSaved.hours} jam</p>
                <p className="text-sm text-vx-text-secondary">
                  Estimasi penghematan: ${data.timeSaved.estimatedCost}
                </p>
              </div>
              <TrendingUp className="h-12 w-12 text-green-500" />
            </div>
          </div>
        </div>

        {/* Escalation Rate */}
        <div>
          <h3 className="mb-4 text-sm font-medium">Tingkat Eskalasi</h3>
          <div className="rounded-lg bg-vx-surface-elevated p-4">
            <p className="text-2xl font-bold">{data.escalationRate.percentage}%</p>
            <p className="text-sm text-vx-text-secondary">
              {data.escalationRate.escalated} dari {data.escalationRate.total} percakapan
            </p>
          </div>
        </div>

        {/* Top Intents */}
        <div>
          <h3 className="mb-4 text-sm font-medium">Intent Teratas</h3>
          <div className="space-y-2">
            {data.topIntents.slice(0, 5).map(intent => (
              <div key={intent.intent} className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium capitalize">{intent.intent.replace('_', ' ')}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-vx-text-secondary">{intent.count}</span>
                  <span className="text-sm font-medium text-vx-teal">{intent.successRate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
