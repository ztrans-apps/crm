// Unified Right Sidebar - Refactored with shared components
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  User, 
  Phone, 
  Edit2, 
  Save, 
  X,
  Users,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Tag,
  FileText,
  XCircle,
  ExternalLink,
  MessageSquare
} from 'lucide-react'

// Import shared components
import { WorkflowStatusManager as WorkflowStatus } from '../shared/WorkflowStatus'
import { ChatLabels } from '../shared/ChatLabels'
import { CustomerProfile } from '../shared/CustomerProfile'
import { NoteForm, NoteCard } from '../shared/NoteForm'
import { ContactDetailModal } from '../shared/ContactDetailModal'
import { ConversationHistory } from '../shared/ConversationHistory'
import { AgentAssignment } from '../shared/AgentAssignment'

interface RightSidebarProps {
  conversation: any
  notes: any[]
  appliedLabels: any[]
  availableLabels: any[]
  onSaveNote: (content: string, rating: number | null) => Promise<void>
  onUpdateContact: (contactId: string, name: string, customFields: any) => Promise<void>
  onHandoverToAgent?: (conversationId: string, agentId: string) => Promise<void>
  onAssignAgent?: (agentId: string) => Promise<void>
  onApplyLabel: (labelId: string) => Promise<void>
  onRemoveLabel: (labelId: string) => Promise<void>
  onCloseConversation?: () => Promise<void>
  onStatusChanged: () => void
  currentUserId: string | null
  userRole: 'owner' | 'agent' | 'supervisor'
  canEditContact: boolean
  canApplyLabel: boolean
  canCreateNote: boolean
  canChangeStatus: boolean
}

export function RightSidebar({
  conversation,
  notes = [],
  appliedLabels = [],
  availableLabels = [],
  onSaveNote,
  onUpdateContact,
  onHandoverToAgent,
  onAssignAgent,
  onApplyLabel,
  onRemoveLabel,
  onCloseConversation,
  onStatusChanged,
  currentUserId,
  userRole,
  canEditContact,
  canApplyLabel,
  canCreateNote,
  canChangeStatus,
}: RightSidebarProps) {
  const [editingContact, setEditingContact] = useState(false)
  const [contactName, setContactName] = useState('')
  const [showContactDetail, setShowContactDetail] = useState(false)
  const [contactDetailEditMode, setContactDetailEditMode] = useState(false)
  const [slaTimer, setSlaTimer] = useState({
    responseTime: 0,
    resolutionTime: 0,
    isOverdue: false,
  })
  
  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    profile: false,
    details: true,
    labels: false,
    notes: false,
    history: false,
    agents: false,
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Initialize contact data
  useEffect(() => {
    if (conversation?.contact) {
      setContactName(conversation.contact.name || '')
    }
  }, [conversation?.contact])

  // SLA Timer calculation
  useEffect(() => {
    if (!conversation) return

    const calculateSLA = () => {
      try {
        const now = new Date()
        const createdAt = new Date(conversation.created_at)
        const workflowStartedAt = conversation.workflow_started_at 
          ? new Date(conversation.workflow_started_at) 
          : createdAt

        const responseTime = Math.floor((now.getTime() - createdAt.getTime()) / 1000 / 60)
        const resolutionTime = Math.floor((now.getTime() - workflowStartedAt.getTime()) / 1000 / 60)

        const isOverdue = 
          (conversation.workflow_status === 'incoming' && responseTime > 30) ||
          (conversation.workflow_status === 'in_progress' && resolutionTime > 120)

        setSlaTimer({ responseTime, resolutionTime, isOverdue })
      } catch (error) {
        console.error('Error calculating SLA:', error)
      }
    }

    calculateSLA()
    const interval = setInterval(calculateSLA, 60000)
    return () => clearInterval(interval)
  }, [conversation])

  const handleSaveContact = async () => {
    if (!conversation?.contact?.id) return

    try {
      await onUpdateContact(conversation.contact.id, contactName, {})
      setEditingContact(false)
      alert('Kontak berhasil diperbarui!')
    } catch (error: any) {
      alert('Gagal memperbarui kontak: ' + error.message)
    }
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const getAvatarInitial = () => {
    if (contactName && contactName.trim()) {
      return contactName.charAt(0).toUpperCase()
    }
    return conversation?.contact?.phone_number?.replace(/\D/g, '').charAt(0) || 'C'
  }

  if (!conversation) {
    return (
      <div className="w-80 border-l bg-white flex items-center justify-center p-4">
        <p className="text-sm text-gray-400">Pilih conversation untuk melihat detail</p>
      </div>
    )
  }

  const isContactSaved = conversation?.contact?.name && conversation.contact.name.trim() !== ''

  return (
    <div className="w-80 border-l bg-white flex flex-col h-full">
      {/* Header with Avatar and Stats */}
      <div className="p-6 border-b">
        {/* Avatar and Name */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-semibold shadow-lg mb-3 relative">
            {getAvatarInitial()}
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          
          {editingContact ? (
            <div className="flex items-center space-x-2 w-full">
              <Input
                placeholder="Nama Kontak"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="h-8 text-sm text-center"
                autoFocus
              />
              <button
                onClick={handleSaveContact}
                className="p-1.5 hover:bg-green-50 rounded text-green-600"
              >
                <Save className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setEditingContact(false)
                  setContactName(conversation?.contact?.name || '')
                }}
                className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {contactName || 'Unknown'}
                </h3>
                {canEditContact && (
                  <button
                    onClick={() => setEditingContact(true)}
                    className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {conversation?.contact?.phone_number}
              </p>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          {onAssignAgent && (
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1 h-8 text-xs"
              onClick={() => toggleSection('agents')}
            >
              <Users className="h-3.5 w-3.5 mr-1" />
              Assign
            </Button>
          )}
          {onCloseConversation && conversation.status === 'open' && (
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1 h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={onCloseConversation}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Close
            </Button>
          )}
        </div>
      </div>

      {/* SLA Alert */}
      {slaTimer.isOverdue && (
        <div className="bg-red-50 border-l-4 border-red-500 px-4 py-2 flex items-center text-xs">
          <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
          <span className="font-medium text-red-700">SLA Overdue!</span>
        </div>
      )}

      {/* Scrollable Menu Items */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Profile Section */}
        <button
          onClick={() => {
            setContactDetailEditMode(false)
            setShowContactDetail(true)
          }}
          className="w-full px-6 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left group"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
            <User className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex-1 flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900">Profile</p>
            {!isContactSaved ? (
              <span 
                className="shrink-0 w-2 h-2 rounded-full bg-orange-500 animate-pulse" 
                title="Kontak belum disimpan"
              />
            ) : (
              <span 
                className="shrink-0 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center" 
                title="Kontak sudah disimpan"
              >
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
          </div>
          {canEditContact && (
            <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium">
              1/4
            </span>
          )}
        </button>

        {/* Details Progress Section */}
        <button
          onClick={() => toggleSection('details')}
          className="w-full px-6 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left group"
        >
          <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-gray-100 transition-colors">
            <FileText className="h-4 w-4 text-gray-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Details Progress</p>
          </div>
          {expandedSections.details ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {/* Details Content */}
        {expandedSections.details && (
          <div className="px-6 py-3 space-y-3 bg-gray-50">
            {/* SLA Timers */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Response Time
                </span>
                <span className={`font-semibold ${
                  slaTimer.responseTime > 30 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {formatTime(slaTimer.responseTime)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Resolution Time
                </span>
                <span className={`font-semibold ${
                  slaTimer.resolutionTime > 120 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {formatTime(slaTimer.resolutionTime)}
                </span>
              </div>
            </div>

            {/* Workflow Status */}
            {canChangeStatus && (
              <div className="pt-2 border-t">
                <WorkflowStatus
                  conversationId={conversation?.id}
                  currentStatus={conversation?.workflow_status || 'incoming'}
                  onStatusChanged={onStatusChanged}
                />
              </div>
            )}
          </div>
        )}

        {/* Assign Agent */}
        <button
          onClick={() => toggleSection('agents')}
          className="w-full px-6 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left group"
        >
          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
            <Users className="h-4 w-4 text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Assign Agent</p>
          </div>
          {expandedSections.agents ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {/* Agent Assignment Content */}
        {expandedSections.agents && (
          <div className="px-6 py-3 bg-gray-50">
            <AgentAssignment
              conversationId={conversation?.id}
              currentAgentId={conversation?.assigned_to}
              currentAgentName={conversation?.assigned_agent?.full_name}
              currentAgentEmail={conversation?.assigned_agent?.email}
              onHandover={onHandoverToAgent}
              onAssign={onAssignAgent}
              canHandover={!!onHandoverToAgent}
              canAssign={!!onAssignAgent}
              userRole={userRole}
            />
          </div>
        )}

        {/* Conversation History */}
        <button
          onClick={() => toggleSection('history')}
          className="w-full px-6 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left group"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
            <MessageSquare className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Conversation History</p>
          </div>
          {expandedSections.history ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {/* Conversation History Content */}
        {expandedSections.history && (
          <div className="px-6 py-3 bg-gray-50">
            <ConversationHistory
              contactId={conversation?.contact?.id}
              currentConversationId={conversation?.id}
              onSelectConversation={(convId) => {
                // Handle conversation selection
              }}
            />
          </div>
        )}

        {/* Chat Labels */}
        {canApplyLabel && (
          <>
            <button
              onClick={() => toggleSection('labels')}
              className="w-full px-6 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                <Tag className="h-4 w-4 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Chat Labels</p>
              </div>
              {appliedLabels.length > 0 && (
                <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium">
                  {appliedLabels.length}
                </span>
              )}
              {expandedSections.labels ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {expandedSections.labels && (
              <div className="px-6 py-3 bg-gray-50">
                <ChatLabels
                  appliedLabels={appliedLabels}
                  availableLabels={availableLabels}
                  onApplyLabel={onApplyLabel}
                  onRemoveLabel={onRemoveLabel}
                />
              </div>
            )}
          </>
        )}

        {/* Notes */}
        {canCreateNote && (
          <>
            <button
              onClick={() => toggleSection('notes')}
              className="w-full px-6 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center group-hover:bg-yellow-100 transition-colors">
                <FileText className="h-4 w-4 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Chat note</p>
              </div>
              {notes.length > 0 && (
                <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium">
                  {notes.length}
                </span>
              )}
              {expandedSections.notes ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {expandedSections.notes && (
              <div className="px-6 py-3 space-y-3 bg-gray-50">
                {/* Add Note Form */}
                <NoteForm onSave={onSaveNote} />
                
                {/* Existing Notes - Show all expanded */}
                {notes.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    {notes.map((note) => (
                      <NoteCard key={note.id} note={note} defaultExpanded={true} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Contact Detail Modal */}
      <ContactDetailModal
        open={showContactDetail}
        onClose={() => {
          setShowContactDetail(false)
          setContactDetailEditMode(false)
        }}
        contact={conversation?.contact}
        onUpdate={onUpdateContact}
        canEdit={canEditContact}
        initialEditMode={contactDetailEditMode}
      />
    </div>
  )
}
