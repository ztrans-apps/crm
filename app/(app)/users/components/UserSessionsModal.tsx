'use client'

import { useState, useEffect } from 'react'
import { X, Check, Loader2, ChevronDown } from 'lucide-react'
import { toast } from '@/lib/stores/toast-store'

interface WhatsAppSession {
  id: string
  session_name: string
  phone_number: string
  status: string
}

interface UserSessionsModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  userName: string
}

export default function UserSessionsModal({
  isOpen,
  onClose,
  userId,
  userName
}: UserSessionsModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [allSessions, setAllSessions] = useState<WhatsAppSession[]>([])
  const [assignedSessionIds, setAssignedSessionIds] = useState<Set<string>>(new Set())
  const [initialAssignedIds, setInitialAssignedIds] = useState<Set<string>>(new Set())
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [hasFullAccess, setHasFullAccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen, userId])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load all available sessions
      const sessionsRes = await fetch('/api/whatsapp/sessions')
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json()
        setAllSessions(sessionsData.sessions || [])
      }

      // Load user's assigned sessions
      const assignedRes = await fetch(`/api/users/${userId}/sessions`)
      if (assignedRes.ok) {
        const assignedData = await assignedRes.json()
        const ids = new Set<string>(assignedData.sessions?.map((s: any) => s.session_id) || [])
        setAssignedSessionIds(ids)
        setInitialAssignedIds(ids)
      }

      // Load user's role to check for full access via permissions
      const userRes = await fetch(`/api/users/${userId}`)
      if (userRes.ok) {
        const userData = await userRes.json()
        const role = userData.user?.roles?.[0]?.role_name || null
        setUserRole(role)
        
        // Dynamic: check if user has admin.access permission via their roles
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: permData } = await supabase
          .from('user_roles')
          .select(`
            roles!inner (
              role_permissions!inner (
                permissions!inner (
                  permission_key
                )
              )
            )
          `)
          .eq('user_id', userId)
        
        let hasAdmin = false
        for (const ur of (permData || [])) {
          const r = (ur as any).roles
          if (!r?.role_permissions) continue
          for (const rp of r.role_permissions) {
            if (rp.permissions?.permission_key === 'admin.access') {
              hasAdmin = true
              break
            }
          }
          if (hasAdmin) break
        }
        setHasFullAccess(hasAdmin)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSession = (sessionId: string) => {
    const newSet = new Set(assignedSessionIds)
    if (newSet.has(sessionId)) {
      newSet.delete(sessionId)
    } else {
      newSet.add(sessionId)
    }
    setAssignedSessionIds(newSet)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Determine which sessions to add and remove
      const toAdd = Array.from(assignedSessionIds).filter(id => !initialAssignedIds.has(id))
      const toRemove = Array.from(initialAssignedIds).filter(id => !assignedSessionIds.has(id))

      // Add new assignments
      if (toAdd.length > 0) {
        const addRes = await fetch(`/api/users/${userId}/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_ids: toAdd })
        })

        if (!addRes.ok) {
          throw new Error('Failed to add session assignments')
        }
      }

      // Remove old assignments
      for (const sessionId of toRemove) {
        const removeRes = await fetch(`/api/users/${userId}/sessions?session_id=${sessionId}`, {
          method: 'DELETE'
        })

        if (!removeRes.ok) {
          throw new Error('Failed to remove session assignment')
        }
      }

      toast.success('Session assignments updated successfully')
      onClose()
    } catch (error: any) {
      console.error('Error saving assignments:', error)
      toast.error(error.message || 'Failed to update session assignments')
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = () => {
    if (assignedSessionIds.size !== initialAssignedIds.size) return true
    for (const id of assignedSessionIds) {
      if (!initialAssignedIds.has(id)) return true
    }
    return false
  }

  const getSelectedSessionsText = () => {
    if (assignedSessionIds.size === 0) {
      return 'Select sessions...'
    }
    if (assignedSessionIds.size === allSessions.length) {
      return 'All sessions selected'
    }
    const selectedNames = allSessions
      .filter(s => assignedSessionIds.has(s.id))
      .map(s => s.session_name)
      .slice(0, 2)
    
    if (assignedSessionIds.size > 2) {
      return `${selectedNames.join(', ')} +${assignedSessionIds.size - 2} more`
    }
    return selectedNames.join(', ')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-vx-teal'
      case 'connecting':
        return 'text-yellow-600 dark:text-yellow-400'
      default:
        return 'text-vx-text-muted'
    }
  }

  if (!isOpen) return null

  // Check if only 1 session exists
  const isSingleSession = allSessions.length === 1

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-vx-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-vx-text">
              Assign WhatsApp Sessions
            </h2>
            <p className="text-sm text-vx-text-muted mt-1">
              {userName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-vx-text-muted hover:text-vx-text-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-vx-purple" />
            </div>
          ) : allSessions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-vx-text-muted">No WhatsApp sessions available</p>
              <p className="text-sm text-vx-text-muted mt-2">
                Please connect a WhatsApp account first
              </p>
            </div>
          ) : isSingleSession ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 bg-vx-purple/10 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-vx-purple" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-blue-900 mb-1">
                    Auto-Access Enabled
                  </h3>
                  <p className="text-sm text-blue-700 mb-3">
                    Since there is only 1 WhatsApp session, all users automatically have access to all conversations.
                  </p>
                  <div className="bg-vx-surface rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-vx-text">
                          {allSessions[0].session_name}
                        </p>
                        <p className="text-sm text-vx-text-muted">
                          {allSessions[0].phone_number || 'No phone number'}
                        </p>
                      </div>
                      <span className={`text-xs font-medium ${getStatusColor(allSessions[0].status)}`}>
                        {allSessions[0].status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : hasFullAccess ? (
            <div className="bg-green-50 border border-vx-teal/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 bg-vx-teal/10 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-vx-teal" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-green-900 mb-1">
                    Full Access Role
                  </h3>
                  <p className="text-sm text-vx-teal mb-2">
                    This user has the <span className="font-semibold">{userRole}</span> role, which grants automatic access to all WhatsApp sessions and conversations.
                  </p>
                  <p className="text-sm text-vx-teal">
                    No session assignment is needed for this user. They can view and manage all conversations across all sessions.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-vx-text-secondary">
                Select which WhatsApp sessions this user can access. Users can be assigned to multiple sessions.
              </p>
              
              {/* Multi-Select Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-vx-surface border-2 border-vx-border rounded-lg hover:border-vx-purple/40 focus:outline-none focus:border-vx-purple transition-colors"
                >
                  <span className={assignedSessionIds.size === 0 ? 'text-vx-text-muted' : 'text-vx-text'}>
                    {getSelectedSessionsText()}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-vx-text-muted transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute z-10 w-full mt-2 bg-vx-surface border border-vx-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {allSessions.map((session) => {
                      const isAssigned = assignedSessionIds.has(session.id)
                      
                      return (
                        <label
                          key={session.id}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-vx-surface-hover cursor-pointer border-b border-vx-border last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={() => toggleSession(session.id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-vx-text truncate">
                                {session.session_name}
                              </span>
                              <span className={`text-xs font-medium ${getStatusColor(session.status)}`}>
                                {session.status}
                              </span>
                            </div>
                            <p className="text-sm text-vx-text-muted truncate">
                              {session.phone_number || 'No phone number'}
                            </p>
                          </div>

                          {isAssigned && (
                            <Check className="w-5 h-5 text-vx-purple shrink-0" />
                          )}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Selected Sessions Display */}
              {assignedSessionIds.size > 0 && (
                <div className="bg-vx-surface-elevated rounded-lg p-4">
                  <p className="text-sm font-medium text-vx-text-secondary mb-2">
                    Selected Sessions ({assignedSessionIds.size})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {allSessions
                      .filter(s => assignedSessionIds.has(s.id))
                      .map(session => (
                        <div
                          key={session.id}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-vx-purple/10 text-vx-purple rounded-full text-sm"
                        >
                          <span>{session.session_name}</span>
                          <button
                            onClick={() => toggleSession(session.id)}
                            className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t bg-vx-surface-elevated">
          <div className="text-sm text-vx-text-secondary">
            {isSingleSession ? (
              'Auto-access enabled'
            ) : hasFullAccess ? (
              `Full access role: ${userRole}`
            ) : (
              `${assignedSessionIds.size} session(s) selected`
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-vx-text-secondary hover:bg-vx-surface-hover rounded-lg transition-colors disabled:opacity-50"
            >
              {isSingleSession || hasFullAccess ? 'Close' : 'Cancel'}
            </button>
            {!isSingleSession && !hasFullAccess && (
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges() || loading}
                className="px-4 py-2 bg-vx-purple text-white rounded-lg hover:bg-vx-purple/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
