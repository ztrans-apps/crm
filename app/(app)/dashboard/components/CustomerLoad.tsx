'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface CustomerLoadData {
  incomingChatsPerHour: Array<{
    hour: string
    count: number
  }>
  peakHour: {
    hour: string
    count: number
  }
  newVsReturning: {
    new: number
    returning: number
  }
  avgWaitTime: {
    peak: number
    offPeak: number
  }
  heatmap: Array<{
    dayOfWeek: number
    hour: number
    count: number
  }>
}

export function CustomerLoad() {
  const [data, setData] = useState<CustomerLoadData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/dashboard/customer-load')
        if (!response.ok) throw new Error('Failed to fetch')
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error('Error fetching customer load:', error)
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
          <CardTitle>Beban Pelanggan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 animate-pulse bg-gray-200 dark:bg-gray-800 rounded" />
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ${seconds % 60}s`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Beban Pelanggan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Incoming Chats Per Hour */}
        <div>
          <h3 className="mb-4 text-sm font-medium">Chat Masuk per Jam (24 Jam Terakhir)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.incomingChatsPerHour}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#93c5fd" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Peak Hour */}
        <div>
          <h3 className="mb-4 text-sm font-medium">Jam Puncak</h3>
          <div className="rounded-lg bg-orange-50 p-4 dark:bg-orange-950">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{data.peakHour.hour}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {data.peakHour.count} percakapan
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* New vs Returning */}
        <div>
          <h3 className="mb-4 text-sm font-medium">Pelanggan Baru vs Kembali</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
              <p className="text-sm text-gray-600 dark:text-gray-400">Baru</p>
              <p className="text-2xl font-bold text-blue-600">{data.newVsReturning.new}</p>
            </div>
            <div className="rounded-lg bg-green-50 p-4 dark:bg-green-950">
              <p className="text-sm text-gray-600 dark:text-gray-400">Kembali</p>
              <p className="text-2xl font-bold text-green-600">{data.newVsReturning.returning}</p>
            </div>
          </div>
        </div>

        {/* Wait Time */}
        <div>
          <h3 className="mb-4 text-sm font-medium">Waktu Tunggu Rata-rata</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
              <p className="text-sm text-gray-600 dark:text-gray-400">Jam Puncak</p>
              <p className="text-xl font-bold">{formatTime(data.avgWaitTime.peak)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
              <p className="text-sm text-gray-600 dark:text-gray-400">Jam Normal</p>
              <p className="text-xl font-bold">{formatTime(data.avgWaitTime.offPeak)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
