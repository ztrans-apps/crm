// Handover Reports Page - View handover statistics per agent
'use client'

import { useState, useEffect } from 'react'
import { AuthGuard } from '@/core/auth'
import { createClient } from '@/lib/supabase/client'
import { conversationService } from '@/features/chat/services'
import { ArrowRight, TrendingUp, TrendingDown, Calendar, User } from 'lucide-react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

export default function HandoverReportsPage() {
  return (
    <AuthGuard>
      <HandoverReportsContent />
    </AuthGuard>
  )
}

function HandoverReportsContent() {
  const supabase = createClient()
  
  interface Agent {
    id: string
    full_name: string
    email: string
    role: string
  }
  
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [handoverStats, setHandoverStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  useEffect(() => {
    loadAgents()
  }, [])

  useEffect(() => {
    if (selectedAgentId) {
      loadHandoverStats()
    }
  }, [selectedAgentId, dateFrom, dateTo])

  const loadAgents = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .in('role', ['agent', 'owner', 'supervisor'])
        .order('full_name')

      if (error) throw error
      
      const agentsList = (data || []) as Agent[]
      setAgents(agentsList)
      
      // Auto-select first agent
      if (agentsList.length > 0) {
        setSelectedAgentId(agentsList[0].id)
      }
    } catch (error) {
      console.error('Error loading agents:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadHandoverStats = async () => {
    if (!selectedAgentId) return

    try {
      setLoading(true)
      const from = dateFrom ? new Date(dateFrom) : undefined
      const to = dateTo ? new Date(dateTo) : undefined
      
      const stats = await conversationService.getHandoverStats(selectedAgentId, from, to)
      setHandoverStats(stats)
    } catch (error) {
      console.error('Error loading handover stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedAgent = agents.find(a => a.id === selectedAgentId)

  return (
    <div className="h-full flex flex-col bg-vx-surface-elevated">
      {/* Header */}
      <div className="bg-vx-surface border-b px-6 py-4">
        <h1 className="text-2xl font-bold text-vx-text">Laporan Handover</h1>
        <p className="text-sm text-vx-text-secondary mt-1">
          Statistik handover per agent dan tracking riwayat
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Filters */}
          <div className="bg-vx-surface rounded-lg border p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Agent Selection */}
              <div>
                <label className="block text-sm font-medium text-vx-text-secondary mb-2">
                  Pilih Agent
                </label>
                <select
                  value={selectedAgentId || ''}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full px-3 py-2 border border-vx-border rounded-lg focus:ring-2 focus:ring-vx-purple/30 focus:border-transparent"
                >
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.full_name} ({agent.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-vx-text-secondary mb-2">
                  Dari Tanggal
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-vx-border rounded-lg focus:ring-2 focus:ring-vx-purple/30 focus:border-transparent"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-vx-text-secondary mb-2">
                  Sampai Tanggal
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-vx-border rounded-lg focus:ring-2 focus:ring-vx-purple/30 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          {handoverStats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Handovers */}
                <div className="bg-vx-surface rounded-lg border p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-vx-text-secondary">Total Handover</h3>
                    <ArrowRight className="h-5 w-5 text-blue-500" />
                  </div>
                  <p className="text-3xl font-bold text-vx-text">{handoverStats.total}</p>
                </div>

                {/* Handed Over */}
                <div className="bg-vx-surface rounded-lg border p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-vx-text-secondary">Diserahkan ke Agent Lain</h3>
                    <TrendingUp className="h-5 w-5 text-red-500" />
                  </div>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">{handoverStats.handedOver}</p>
                </div>

                {/* Received */}
                <div className="bg-vx-surface rounded-lg border p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-vx-text-secondary">Diterima dari Agent Lain</h3>
                    <TrendingDown className="h-5 w-5 text-green-500" />
                  </div>
                  <p className="text-3xl font-bold text-vx-teal">{handoverStats.received}</p>
                </div>
              </div>

              {/* Handover Lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Handed Over List */}
                <div className="bg-vx-surface rounded-lg border">
                  <div className="px-6 py-4 border-b">
                    <h3 className="text-lg font-semibold text-vx-text">
                      Diserahkan ke Agent Lain ({handoverStats.handedOver})
                    </h3>
                  </div>
                  <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                    {handoverStats.handedOverList.length === 0 ? (
                      <p className="text-sm text-vx-text-muted text-center py-4">
                        Tidak ada handover yang diserahkan
                      </p>
                    ) : (
                      handoverStats.handedOverList.map((handover: any) => (
                        <div
                          key={handover.id}
                          className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <ArrowRight className="h-4 w-4 text-red-500" />
                            <span className="text-sm font-medium text-vx-text">
                              {handover.to_agent.full_name}
                            </span>
                          </div>
                          {handover.conversation?.contact && (
                            <p className="text-xs text-vx-text-secondary mb-1">
                              Kontak: {handover.conversation.contact.name || handover.conversation.contact.phone_number}
                            </p>
                          )}
                          {handover.reason && (
                            <p className="text-xs text-vx-text-secondary mb-1">
                              Alasan: {handover.reason}
                            </p>
                          )}
                          <p className="text-xs text-vx-text-muted">
                            {format(new Date(handover.handover_at), 'dd MMM yyyy HH:mm', { locale: localeId })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Received List */}
                <div className="bg-vx-surface rounded-lg border">
                  <div className="px-6 py-4 border-b">
                    <h3 className="text-lg font-semibold text-vx-text">
                      Diterima dari Agent Lain ({handoverStats.received})
                    </h3>
                  </div>
                  <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                    {handoverStats.receivedList.length === 0 ? (
                      <p className="text-sm text-vx-text-muted text-center py-4">
                        Tidak ada handover yang diterima
                      </p>
                    ) : (
                      handoverStats.receivedList.map((handover: any) => (
                        <div
                          key={handover.id}
                          className="p-3 bg-vx-teal/5 border border-vx-teal/20 rounded-lg"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <ArrowRight className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium text-vx-text">
                              {handover.from_agent.full_name}
                            </span>
                          </div>
                          {handover.conversation?.contact && (
                            <p className="text-xs text-vx-text-secondary mb-1">
                              Kontak: {handover.conversation.contact.name || handover.conversation.contact.phone_number}
                            </p>
                          )}
                          {handover.reason && (
                            <p className="text-xs text-vx-text-secondary mb-1">
                              Alasan: {handover.reason}
                            </p>
                          )}
                          <p className="text-xs text-vx-text-muted">
                            {format(new Date(handover.handover_at), 'dd MMM yyyy HH:mm', { locale: localeId })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vx-purple"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
