'use client'

import { MessageSquare, Clock, Send, Ticket, MessageCircle } from 'lucide-react'
import { KPICard } from './KPICard'
import { useEffect, useState } from 'react'

interface KPIData {
  activeConversations: {
    value: number
    trend: 'up' | 'down' | 'stable'
    change: number
  }
  avgResponseTime: {
    value: number
    trend: 'up' | 'down' | 'stable'
    change: number
    slaStatus: 'good' | 'warning' | 'critical'
  }
  whatsappDeliveryRate: {
    value: number
    trend: 'up' | 'down' | 'stable'
    change: number
    status: 'good' | 'warning' | 'critical'
  }
  openTickets: {
    value: number
    trend: 'up' | 'down' | 'stable'
    change: number
    byPriority: { high: number; medium: number; low: number }
  }
  messagesToday: {
    value: number
    trend: 'up' | 'down' | 'stable'
    change: number
  }
}

export function KPIStrip() {
  const [data, setData] = useState<KPIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchKPIs() {
      try {
        const response = await fetch('/api/dashboard/kpi')
        if (!response.ok) throw new Error('Failed to fetch KPIs')
        const kpiData = await response.json()
        setData(kpiData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchKPIs()
    // Refresh every 30 seconds
    const interval = setInterval(fetchKPIs, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
        Error loading KPIs: {error || 'Unknown error'}
      </div>
    )
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m`
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
      <KPICard
        title="Percakapan Aktif"
        value={data.activeConversations.value}
        trend={data.activeConversations.trend}
        change={data.activeConversations.change}
        icon={MessageSquare}
      />
      
      <KPICard
        title="Waktu Respons Rata-rata"
        value={formatTime(data.avgResponseTime.value)}
        trend={data.avgResponseTime.trend}
        change={data.avgResponseTime.change}
        status={data.avgResponseTime.slaStatus}
        icon={Clock}
        subtitle={`SLA: ${data.avgResponseTime.slaStatus === 'good' ? 'Terpenuhi' : 'Tidak Terpenuhi'}`}
      />
      
      <KPICard
        title="Tingkat Pengiriman WA"
        value={data.whatsappDeliveryRate.value}
        trend={data.whatsappDeliveryRate.trend}
        change={data.whatsappDeliveryRate.change}
        status={data.whatsappDeliveryRate.status}
        icon={Send}
        suffix="%"
      />
      
      <KPICard
        title="Tiket Terbuka"
        value={data.openTickets.value}
        trend={data.openTickets.trend}
        change={data.openTickets.change}
        icon={Ticket}
        subtitle={`High: ${data.openTickets.byPriority.high} | Med: ${data.openTickets.byPriority.medium} | Low: ${data.openTickets.byPriority.low}`}
      />
      
      <KPICard
        title="Pesan Hari Ini"
        value={data.messagesToday.value}
        trend={data.messagesToday.trend}
        change={data.messagesToday.change}
        icon={MessageCircle}
      />
    </div>
  )
}
