'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface WhatsAppPerformanceData {
  messageFunnel: {
    sent: number
    delivered: number
    read: number
    failed: number
  }
  broadcastSuccessRate: {
    total: number
    successful: number
    failed: number
    percentage: number
  }
  failedMessages: Array<{
    id: string
    recipient: string
    error: string
    timestamp: string
  }>
  activeSessions: Array<{
    sessionId: string
    phoneNumber: string
    status: 'connected' | 'disconnected' | 'reconnecting'
    lastSeen: string
  }>
  queueMetrics: {
    depth: number
    processingRate: number
  }
}

export function WhatsAppPerformance() {
  const [data, setData] = useState<WhatsAppPerformanceData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/dashboard/whatsapp-performance')
        if (!response.ok) throw new Error('Failed to fetch')
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error('Error fetching WhatsApp performance:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performa WhatsApp</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 animate-pulse bg-gray-200 dark:bg-gray-800 rounded" />
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const deliveryRate = data.messageFunnel.sent > 0
    ? ((data.messageFunnel.delivered / data.messageFunnel.sent) * 100).toFixed(1)
    : '100'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performa WhatsApp</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Message Funnel */}
        <div>
          <h3 className="mb-4 text-sm font-medium">Alur Pengiriman Pesan (24 Jam)</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-blue-50 p-3 dark:bg-blue-950">
              <span className="text-sm font-medium">Terkirim</span>
              <span className="text-lg font-bold">{data.messageFunnel.sent}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-green-50 p-3 dark:bg-green-950">
              <span className="text-sm font-medium">Delivered</span>
              <span className="text-lg font-bold">{data.messageFunnel.delivered}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-purple-50 p-3 dark:bg-purple-950">
              <span className="text-sm font-medium">Dibaca</span>
              <span className="text-lg font-bold">{data.messageFunnel.read}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-red-50 p-3 dark:bg-red-950">
              <span className="text-sm font-medium">Gagal</span>
              <span className="text-lg font-bold">{data.messageFunnel.failed}</span>
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tingkat Pengiriman: <span className="font-bold text-green-600">{deliveryRate}%</span>
            </p>
          </div>
        </div>

        {/* Broadcast Success */}
        <div>
          <h3 className="mb-4 text-sm font-medium">Tingkat Keberhasilan Broadcast</h3>
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{data.broadcastSuccessRate.percentage}%</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {data.broadcastSuccessRate.successful} dari {data.broadcastSuccessRate.total} berhasil
                </p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
          </div>
        </div>

        {/* Active Sessions */}
        <div>
          <h3 className="mb-4 text-sm font-medium">Sesi Aktif</h3>
          <div className="space-y-2">
            {data.activeSessions.length === 0 ? (
              <p className="text-sm text-gray-500">Tidak ada sesi aktif</p>
            ) : (
              data.activeSessions.slice(0, 5).map(session => (
                <div key={session.sessionId} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    {session.status === 'connected' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : session.status === 'reconnecting' ? (
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="text-sm font-medium">{session.phoneNumber}</span>
                  </div>
                  <span className="text-xs text-gray-500">{session.status}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Queue Metrics */}
        <div>
          <h3 className="mb-4 text-sm font-medium">Antrian Pesan</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
              <p className="text-sm text-gray-600 dark:text-gray-400">Kedalaman Antrian</p>
              <p className="text-2xl font-bold">{data.queueMetrics.depth}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
              <p className="text-sm text-gray-600 dark:text-gray-400">Kecepatan Proses</p>
              <p className="text-2xl font-bold">{data.queueMetrics.processingRate}/min</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
