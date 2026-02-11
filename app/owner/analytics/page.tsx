// Owner Analytics Page - Agent Performance Dashboard
'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Users,
  MessageSquare,
  Clock,
  CheckCircle2,
  TrendingUp,
  Download,
  Calendar,
  Inbox,
  PlayCircle,
} from 'lucide-react'
import { getAllAgentsWorkflowStats } from '@/lib/api/workflow'

interface AgentStats {
  agent_id: string
  agent_name: string | null
  agent_email: string
  total: number
  incoming: number
  waiting: number
  in_progress: number
  done: number
  avg_handling_time: number | null
  avg_first_response_time: number | null
}

export default function AnalyticsPage() {
  const [agentStats, setAgentStats] = useState<AgentStats[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week')

  useEffect(() => {
    loadAnalytics()
  }, [dateRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)

      // Calculate date range
      let startDate: string | undefined
      const now = new Date()

      switch (dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString()
          break
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7)).toISOString()
          break
        case 'month':
          startDate = new Date(now.setDate(now.getDate() - 30)).toISOString()
          break
        case 'all':
          startDate = undefined
          break
      }

      const stats = await getAllAgentsWorkflowStats(startDate)
      setAgentStats(stats)
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number | null) => {
    if (!seconds) return '-'
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}j ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}d`
    } else {
      return `${secs}d`
    }
  }

  const getTotalStats = () => {
    return {
      total: agentStats.reduce((sum, a) => sum + a.total, 0),
      incoming: agentStats.reduce((sum, a) => sum + a.incoming, 0),
      waiting: agentStats.reduce((sum, a) => sum + a.waiting, 0),
      in_progress: agentStats.reduce((sum, a) => sum + a.in_progress, 0),
      done: agentStats.reduce((sum, a) => sum + a.done, 0),
    }
  }

  const totalStats = getTotalStats()

  const exportToCSV = () => {
    const headers = [
      'Agent',
      'Email',
      'Total',
      'Masuk',
      'Menunggu',
      'In Progress',
      'Selesai',
      'Avg Handling Time',
      'Avg First Response',
    ]

    const rows = agentStats.map(agent => [
      agent.agent_name || 'N/A',
      agent.agent_email,
      agent.total,
      agent.incoming,
      agent.waiting,
      agent.in_progress,
      agent.done,
      formatTime(agent.avg_handling_time),
      formatTime(agent.avg_first_response_time),
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agent-analytics-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Laporan Analitik Agent</h1>
          <p className="text-gray-500 mt-1">
            Monitor performa dan workflow agent
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Date Range Filter */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <Button
              type="button"
              variant={dateRange === 'today' ? 'default' : 'ghost'}
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                console.log('Date range: today')
                setDateRange('today')
              }}
              className="cursor-pointer"
            >
              Hari Ini
            </Button>
            <Button
              type="button"
              variant={dateRange === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                console.log('Date range: week')
                setDateRange('week')
              }}
              className="cursor-pointer"
            >
              7 Hari
            </Button>
            <Button
              type="button"
              variant={dateRange === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                console.log('Date range: month')
                setDateRange('month')
              }}
              className="cursor-pointer"
            >
              30 Hari
            </Button>
            <Button
              type="button"
              variant={dateRange === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                console.log('Date range: all')
                setDateRange('all')
              }}
              className="cursor-pointer"
            >
              Semua
            </Button>
          </div>
          <Button 
            type="button"
            onClick={(e) => {
              e.preventDefault()
              console.log('Export CSV clicked')
              exportToCSV()
            }} 
            variant="outline" 
            size="sm"
            className="cursor-pointer"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Obrolan</p>
              <p className="text-2xl font-bold mt-1">{totalStats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Masuk</p>
              <p className="text-2xl font-bold mt-1">{totalStats.incoming}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Inbox className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Menunggu</p>
              <p className="text-2xl font-bold mt-1">{totalStats.waiting}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">In Progress</p>
              <p className="text-2xl font-bold mt-1">{totalStats.in_progress}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <PlayCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Selesai</p>
              <p className="text-2xl font-bold mt-1">{totalStats.done}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Agent Performance Table */}
      <Card>
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Performa Per Agent
          </h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
          ) : agentStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Users className="h-12 w-12 mb-2 opacity-50" />
              <p>Tidak ada data agent</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Masuk</TableHead>
                  <TableHead className="text-center">Menunggu</TableHead>
                  <TableHead className="text-center">In Progress</TableHead>
                  <TableHead className="text-center">Selesai</TableHead>
                  <TableHead className="text-center">Completion Rate</TableHead>
                  <TableHead className="text-center">Avg Handling Time</TableHead>
                  <TableHead className="text-center">Avg First Response</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentStats.map((agent) => {
                  const completionRate = agent.total > 0 
                    ? Math.round((agent.done / agent.total) * 100) 
                    : 0

                  return (
                    <TableRow key={agent.agent_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {agent.agent_name || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {agent.agent_email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{agent.total}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-blue-500">{agent.incoming}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-yellow-500">{agent.waiting}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-green-500">{agent.in_progress}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{agent.done}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          <span className={`font-semibold ${
                            completionRate >= 80 ? 'text-green-600' :
                            completionRate >= 50 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {completionRate}%
                          </span>
                          {completionRate >= 80 && (
                            <TrendingUp className="h-4 w-4 ml-1 text-green-600" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm">
                          {formatTime(agent.avg_handling_time)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm">
                          {formatTime(agent.avg_first_response_time)}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      {/* Performance Insights */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2" />
          Insights
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600 font-medium mb-1">
              Total Active Agents
            </p>
            <p className="text-2xl font-bold text-blue-900">
              {agentStats.length}
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600 font-medium mb-1">
              Overall Completion Rate
            </p>
            <p className="text-2xl font-bold text-green-900">
              {totalStats.total > 0 
                ? Math.round((totalStats.done / totalStats.total) * 100)
                : 0}%
            </p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-600 font-medium mb-1">
              Pending Conversations
            </p>
            <p className="text-2xl font-bold text-yellow-900">
              {totalStats.incoming + totalStats.waiting + totalStats.in_progress}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
