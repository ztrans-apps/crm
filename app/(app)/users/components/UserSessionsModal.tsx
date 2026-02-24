'use client'

import { useState, useEffect } from 'react'
import { X, Check, Loader2, ChevronDown } from 'lucide-react'

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

      // Load user's role to check for full access
      const userRes = await fetch(`/api/users/${userId}`)
      if (userRes.ok) {
        const userData = await userRes.json()
        const role = userData.user?.roles?.[0]?.role_name || null
        setUserRole(role)
        
        // Check if user has full access role
        const fullAccessRoles = ['Owner', 'Supervisor', 'Super Admin', 'Admin', 'Manager']
        setHasFullAccess(role && fullAccessRoles.includes(role))
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

      alert('Session assignments updated successfully')
      onClose()
    } catch (error: any) {
      console.error('Error saving assignments:', error)
      alert(error.message || 'Failed to update session assignments')
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
        return 'text-green-600'
      case 'connecting':
        return 'text-yellow-600'
      default:
        return 'text-gray-400'
    }
  }

  if (!isOpen) return null

  // Check if only 1 session exists
  const isSingleSession = allSessions.length === 1

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Assign WhatsApp Sessions
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {userName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : allSessions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No WhatsApp sessions available</p>
              <p className="text-sm text-gray-400 mt-2">
                Please connect a WhatsApp account first
              </p>
            </div>
          ) : isSingleSession ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-blue-900 mb-1">
                    Auto-Access Enabled
                  </h3>
                  <p className="text-sm text-blue-700 mb-3">
                    Since there is only 1 WhatsApp session, all users automatically have access to all conversations.
                  </p>
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {allSessions[0].session_name}
                        </p>
                        <p className="text-sm text-gray-500">
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
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-green-900 mb-1">
                    Full Access Role
                  </h3>
                  <p className="text-sm text-green-700 mb-2">
                    This user has the <span className="font-semibold">{userRole}</span> role, which grants automatic access to all WhatsApp sessions and conversations.
                  </p>
                  <p className="text-sm text-green-700">
                    No session assignment is needed for this user. They can view and manage all conversations across all sessions.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Select which WhatsApp sessions this user can access. Users can be assigned to multiple sessions.
              </p>
              
              {/* Multi-Select Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-400 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <span className={assignedSessionIds.size === 0 ? 'text-gray-400' : 'text-gray-900'}>
                    {getSelectedSessionsText()}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {allSessions.map((session) => {
                      const isAssigned = assignedSessionIds.has(session.id)
                      
                      return (
                        <label
                          key={session.id}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={() => toggleSession(session.id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 truncate">
                                {session.session_name}
                              </span>
                              <span className={`text-xs font-medium ${getStatusColor(session.status)}`}>
                                {session.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 truncate">
                              {session.phone_number || 'No phone number'}
                            </p>
                          </div>

                          {isAssigned && (
                            <Check className="w-5 h-5 text-blue-600 shrink-0" />
                          )}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Selected Sessions Display */}
              {assignedSessionIds.size > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Selected Sessions ({assignedSessionIds.size})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {allSessions
                      .filter(s => assignedSessionIds.has(s.id))
                      .map(session => (
                        <div
                          key={session.id}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm"
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
        <div className="flex items-center justify-between gap-3 p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
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
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSingleSession || hasFullAccess ? 'Close' : 'Cancel'}
            </button>
            {!isSingleSession && !hasFullAccess && (
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges() || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
