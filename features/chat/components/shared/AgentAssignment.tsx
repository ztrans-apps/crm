// Agent Assignment Component - Show current agent and handover options
'use client'

import { useState, useEffect } from 'react'
import { UserCircle, X, ChevronDown, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AgentAssignmentProps {
  conversationId: string
  currentAgentId: string | null
  currentAgentName?: string
  currentAgentEmail?: string
  onHandover?: (conversationId: string, agentId: string) => Promise<void>
  onAssign?: (agentId: string) => Promise<void>
  onAutoAssign?: (conversationId: string) => Promise<void>
  canHandover?: boolean
  canAssign?: boolean
  userRole?: 'owner' | 'agent' | 'supervisor'
}

interface Agent {
  id: string
  full_name: string
  email: string
  agent_status: 'available' | 'busy' | 'offline'
}

export function AgentAssignment({
  conversationId,
  currentAgentId,
  currentAgentName,
  currentAgentEmail,
  onHandover,
  onAssign,
  onAutoAssign,
  canHandover = false,
  canAssign = false,
  userRole = 'agent'
}: AgentAssignmentProps) {
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<string>('')

  useEffect(() => {
    if (showDropdown) {
      loadAvailableAgents()
    }
  }, [showDropdown])

  const loadAvailableAgents = async () => {
    try {
      setLoading(true)
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      // Build query to get agents - only show truly online agents
      // Agent is considered online if:
      // 1. agent_status is 'available' or 'busy'
      // 2. last_activity is within last 2 minutes
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
      
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, agent_status, last_activity')
        .eq('role', 'agent')
        .in('agent_status', ['available', 'busy'])
        .not('last_activity', 'is', null)
        .gte('last_activity', twoMinutesAgo)
        .order('full_name')

      // Exclude current agent if exists
      if (currentAgentId) {
        query = query.neq('id', currentAgentId)
      }

      const { data, error } = await query

      if (error) throw error
      setAvailableAgents(data || [])
    } catch (error) {
      console.error('Error loading agents:', error)
      setAvailableAgents([])
    } finally {
      setLoading(false)
    }
  }

  const handleAssignOrHandover = async () => {
    if (!selectedAgent) return

    try {
      if (currentAgentId && onHandover) {
        // Handover to another agent
        await onHandover(conversationId, selectedAgent)
        alert('Berhasil handover ke agent lain!')
      } else if (onAssign) {
        // Assign to agent (first time)
        await onAssign(selectedAgent)
        alert('Berhasil assign agent!')
      }
      
      setShowDropdown(false)
      setSelectedAgent('')
    } catch (error: any) {
      alert('Gagal: ' + error.message)
    }
  }

  const handleAutoAssign = async () => {
    if (!onAutoAssign) return

    if (!confirm('Auto-assign conversation ke agent yang tersedia?')) return

    try {
      await onAutoAssign(conversationId)
      alert('Berhasil auto-assign agent!')
    } catch (error: any) {
      alert('Gagal auto-assign: ' + error.message)
    }
  }

  const handleRemoveAgent = async () => {
    if (!currentAgentId || !onAssign) return
    
    if (!confirm('Yakin ingin unassign agent ini?')) return

    try {
      await onAssign('') // Empty string to unassign
      alert('Agent berhasil di-unassign!')
    } catch (error: any) {
      alert('Gagal unassign: ' + error.message)
    }
  }

  return (
    <div className="space-y-3">
      {/* Current Agent Display */}
      {currentAgentId ? (
        <div className="relative">
          <label className="text-xs font-medium text-gray-600 mb-1 block">
            Agent Saat Ini
          </label>
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-semibold">
              {currentAgentName?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">
                {currentAgentName || 'Unknown Agent'}
              </p>
              {currentAgentEmail && (
                <p className="text-[10px] text-gray-500 truncate">
                  {currentAgentEmail}
                </p>
              )}
            </div>
            {canHandover && userRole === 'owner' && (
              <button
                onClick={handleRemoveAgent}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="Unassign agent"
              >
                <X className="h-3.5 w-3.5 text-gray-500" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-xs text-yellow-700 flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            Belum ada agent yang ditugaskan
          </p>
        </div>
      )}

      {/* Agents Section - Add/Handover */}
      {(canHandover || canAssign) && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-green-600 flex items-center gap-1">
            <UserCircle className="h-3.5 w-3.5" />
            {currentAgentId ? 'Handover ke Agent Lain' : 'Pilih Agent'}
          </label>

          {/* Auto-assign button (only for owner when no agent assigned) */}
          {!currentAgentId && userRole === 'owner' && onAutoAssign && (
            <Button
              onClick={handleAutoAssign}
              className="w-full h-9 bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Auto-Assign (Round-Robin)
            </Button>
          )}

          {/* Manual assignment label */}
          {!currentAgentId && userRole === 'owner' && onAutoAssign && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-gray-50 px-2 text-gray-500">atau pilih manual</span>
              </div>
            </div>
          )}
          
          {/* Dropdown to select agent */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-full p-3 text-left border-2 border-green-500 rounded-lg hover:bg-green-50 transition-colors flex items-center justify-between"
            >
              <span className="text-sm font-medium text-gray-700">
                {selectedAgent 
                  ? availableAgents.find(a => a.id === selectedAgent)?.full_name 
                  : 'Pilih agent...'
                }
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${
                showDropdown ? 'rotate-180' : ''
              }`} />
            </button>

            {/* Dropdown List */}
            {showDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {loading ? (
                  <div className="p-3 text-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500 mx-auto"></div>
                  </div>
                ) : availableAgents.length === 0 ? (
                  <div className="p-3 text-center text-xs text-gray-500">
                    Tidak ada agent online saat ini
                  </div>
                ) : (
                  availableAgents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => {
                        setSelectedAgent(agent.id)
                        setShowDropdown(false)
                      }}
                      className="w-full p-3 text-left hover:bg-gray-50 transition-colors border-b last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                          {agent.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {agent.full_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {agent.email}
                          </p>
                        </div>
                        {agent.agent_status && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            agent.agent_status === 'available' 
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {agent.agent_status}
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Assign/Handover Button */}
          {selectedAgent && (
            <Button
              onClick={handleAssignOrHandover}
              className="w-full h-9 bg-green-600 hover:bg-green-700 text-white"
            >
              {currentAgentId ? 'Handover' : 'Assign Agent'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
