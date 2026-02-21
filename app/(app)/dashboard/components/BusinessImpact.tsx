'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus, DollarSign, Users, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BusinessImpactData {
  leadsGenerated: {
    total: number
    trend: 'up' | 'down' | 'stable'
    change: number
  }
  ticketsResolved: {
    today: number
    week: number
    month: number
  }
  campaignConversion: Array<{
    campaignId: string
    campaignName: string
    sent: number
    responded: number
    converted: number
    conversionRate: number
  }>
  repeatCustomerRate: {
    rate: number
    trend: 'up' | 'down' | 'stable'
  }
  costPerConversation: {
    amount: number
    savings: number
  }
}

export function BusinessImpact() {
  const [data, setData] = useState<BusinessImpactData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/dashboard/business-impact')
        if (!response.ok) throw new Error('Failed to fetch')
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error('Error fetching business impact:', error)
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
          <CardTitle>Dampak Bisnis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 animate-pulse bg-gray-200 dark:bg-gray-800 rounded" />
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const TrendIcon = data.leadsGenerated.trend === 'up' ? TrendingUp : 
                    data.leadsGenerated.trend === 'down' ? TrendingDown : Minus

  const trendColor = data.leadsGenerated.trend === 'up' ? 'text-green-600' : 
                     data.leadsGenerated.trend === 'down' ? 'text-red-600' : 'text-gray-600'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dampak Bisnis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Leads Generated */}
        <div>
          <h3 className="mb-4 text-sm font-medium">Lead yang Dihasilkan</h3>
          <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{data.leadsGenerated.total}</p>
                <div className={cn('flex items-center gap-1 text-sm', trendColor)}>
                  <TrendIcon className="h-4 w-4" />
                  <span>{data.leadsGenerated.change}% dari bulan lalu</span>
                </div>
              </div>
              <Users className="h-12 w-12 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Tickets Resolved */}
        <div>
          <h3 className="mb-4 text-sm font-medium">Tiket Terselesaikan</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
              <p className="text-sm text-gray-600 dark:text-gray-400">Hari Ini</p>
              <p className="text-xl font-bold">{data.ticketsResolved.today}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
              <p className="text-sm text-gray-600 dark:text-gray-400">Minggu Ini</p>
              <p className="text-xl font-bold">{data.ticketsResolved.week}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
              <p className="text-sm text-gray-600 dark:text-gray-400">Bulan Ini</p>
              <p className="text-xl font-bold">{data.ticketsResolved.month}</p>
            </div>
          </div>
        </div>

        {/* Cost Per Conversation */}
        <div>
          <h3 className="mb-4 text-sm font-medium">Biaya per Percakapan</h3>
          <div className="rounded-lg bg-green-50 p-4 dark:bg-green-950">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">${data.costPerConversation.amount}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Penghematan: ${data.costPerConversation.savings}
                </p>
              </div>
              <DollarSign className="h-12 w-12 text-green-500" />
            </div>
          </div>
        </div>

        {/* Repeat Customer Rate */}
        <div>
          <h3 className="mb-4 text-sm font-medium">Tingkat Pelanggan Kembali</h3>
          <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-950">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-600">{data.repeatCustomerRate.rate}%</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Trend: {data.repeatCustomerRate.trend === 'up' ? '↑ Naik' : 
                          data.repeatCustomerRate.trend === 'down' ? '↓ Turun' : '→ Stabil'}
                </p>
              </div>
              <CheckCircle className="h-12 w-12 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Campaign Conversion */}
        <div>
          <h3 className="mb-4 text-sm font-medium">Konversi Kampanye</h3>
          <div className="space-y-2">
            {data.campaignConversion.slice(0, 5).map(campaign => (
              <div key={campaign.campaignId} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{campaign.campaignName}</span>
                  <span className="text-sm font-bold text-green-600">{campaign.conversionRate}%</span>
                </div>
                <div className="mt-2 flex gap-4 text-xs text-gray-600 dark:text-gray-400">
                  <span>Terkirim: {campaign.sent}</span>
                  <span>Respons: {campaign.responded}</span>
                  <span>Konversi: {campaign.converted}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
