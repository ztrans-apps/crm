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
  MessageSquare,
  Star
} from 'lucide-react'

// Import shared components
import { WorkflowStatusManager as WorkflowStatus } from '../shared/WorkflowStatus'
import { ChatLabels } from '../shared/ChatLabels'
import { CustomerProfile } from '../shared/CustomerProfile'
import { NoteForm, NoteCard } from '../shared/NoteForm'
import { InternalNoteForm } from '../shared/InternalNoteForm'
import { ReviewForm } from '../shared/ReviewForm'
import { ContactDetailModal } from '../shared/ContactDetailModal'
import { ConversationHistory } from '../shared/ConversationHistory'
import { ConversationHistoryModal } from '../shared/ConversationHistoryModal'
import { AgentAssignment } from '../shared/AgentAssignment'
import { HandoverHistory } from '../shared/HandoverHistory'

interface RightSidebarProps {
  conversation: any
  notes: any[]
  appliedLabels: any[]
  availableLabels: any[]
  onSaveNote: (content: string, rating: number | null, noteType?: 'internal' | 'review') => Promise<void>
  onUpdateContact: (contactId: string, name: string, customFields: any) => Promise<void>
  onHandoverToAgent?: (conversationId: string, agentId: string) => Promise<void>
  onAssignAgent?: (agentId: string) => Promise<void>
  onAutoAssignAgent?: (conversationId: string) => Promise<void>
  onApplyLabel: (labelId: string) => Promise<void>
  onRemoveLabel: (labelId: string) => Promise<void>
  onCloseConversation?: () => Promise<void>
  onSelectConversation?: (conversationId: string) => void
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
  onAutoAssignAgent,
  onApplyLabel,
  onRemoveLabel,
  onCloseConversation,
  onSelectConversation,
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
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyModalConversationId, setHistoryModalConversationId] = useState<string | null>(null)
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
    reviews: false,
    history: false,
    agents: false,
    handovers: false,
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
        
        // Response Time: Time from first customer message to first agent reply
        // If agent hasn't replied yet, show time since first customer message
        let responseTime = 0
        if (conversation.first_response_at) {
          // Agent has responded - show the response time
          const firstMessageAt = new Date(conversation.created_at)
          const firstResponseAt = new Date(conversation.first_response_at)
          responseTime = Math.floor((firstResponseAt.getTime() - firstMessageAt.getTime()) / 1000 / 60)
        } else {
          // Agent hasn't responded yet - show time since first message
          const firstMessageAt = new Date(conversation.created_at)
          responseTime = Math.floor((now.getTime() - firstMessageAt.getTime()) / 1000 / 60)
        }
        
        // Resolution Time: Time from workflow started to now (or closed)
        const workflowStartedAt = conversation.workflow_started_at 
          ? new Date(conversation.workflow_started_at) 
          : new Date(conversation.created_at)
        
        const resolutionEndTime = conversation.status === 'closed' && conversation.closed_at
          ? new Date(conversation.closed_at)
          : now
        
        const resolutionTime = Math.floor((resolutionEndTime.getTime() - workflowStartedAt.getTime()) / 1000 / 60)

        // Check if overdue (only if not yet responded or not yet closed)
        const isOverdue = 
          (!conversation.first_response_at && responseTime > 30) || // No response after 30 min
          (conversation.status !== 'closed' && resolutionTime > 120) // Not closed after 2 hours

        setSlaTimer({ responseTime, resolutionTime, isOverdue })
      } catch (error) {
        console.error('Error calculating SLA:', error)
      }
    }

    calculateSLA()
    const interval = setInterval(calculateSLA, 60000)
    return () => clearInterval(interval)
  }, [conversation])

  // Calculate profile completeness
  const getProfileCompleteness = () => {
    if (!conversation?.contact) return { filled: 0, total: 4 }
    
    const contact = conversation.contact
    let filled = 0
    const total = 4
    
    // Check 4 important fields:
    // 1. Name (required - always counted if exists)
    if (contact.name && contact.name.trim()) filled++
    
    // 2. Email
    if (contact.email || contact.metadata?.email) filled++
    
    // 3. Organization/Company
    if (contact.metadata?.organization) filled++
    
    // 4. Address (street + city)
    if (contact.metadata?.street || contact.metadata?.city) filled++
    
    return { filled, total }
  }

  const profileCompleteness = getProfileCompleteness()

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

  const handleViewHistoryInModal = (conversationId: string) => {
    setHistoryModalConversationId(conversationId)
    setShowHistoryModal(true)
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
      {/* Header - Compact Design with Frame */}
      <div className="bg-gray-50 p-4">
        {/* Contact Details Frame - Avatar + Info */}
        <div className="mx-auto max-w-sm border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
          {/* Large Avatar - Inside Frame */}
          <div className="py-6 px-4 flex justify-center bg-gray-50">
            <div className="w-24 h-24 rounded-full border-4 border-teal-200 bg-white flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-teal-600 flex items-center justify-center text-white text-3xl font-semibold">
                {getAvatarInitial()}
              </div>
            </div>
          </div>

          {/* Contact Details - Sender and Mobile */}
          <div className="px-4 py-4 space-y-3 bg-white">
            {/* Sender - With Edit */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-teal-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-0.5">Sender:</p>
                {editingContact ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      placeholder="Nama Kontak"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="h-7 text-sm font-semibold"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveContact}
                      className="p-1 hover:bg-green-50 rounded text-green-600 flex-shrink-0"
                    >
                      <Save className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingContact(false)
                        setContactName(conversation?.contact?.name || '')
                      }}
                      className="p-1 hover:bg-gray-100 rounded text-gray-500 flex-shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {contactName || conversation?.contact?.phone_number || 'Unknown'}
                    </p>
                    {canEditContact && (
                      <button
                        onClick={() => setEditingContact(true)}
                        className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 flex-shrink-0"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100"></div>

            {/* Mobile */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Phone className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-0.5">Mobile:</p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {conversation?.contact?.phone_number || '-'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Hidden for owner */}
        {userRole !== 'owner' && (
          <div className="mt-3 flex gap-2 max-w-sm mx-auto">
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
        )}
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
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              profileCompleteness.filled === profileCompleteness.total 
                ? 'bg-green-100 text-green-700' 
                : 'bg-orange-100 text-orange-700'
            }`}>
              {profileCompleteness.filled}/{profileCompleteness.total}
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
          <div className="px-6 py-3 space-y-4 bg-gray-50">
            {/* Timeline - Waktu Penting */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-gray-700 mb-2">Timeline</p>
              
              {/* Customer First Message */}
              <div className="flex items-start justify-between text-xs">
                <span className="text-gray-600 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Customer kirim pesan
                </span>
                <span className="font-medium text-gray-900">
                  {new Date(conversation.created_at).toLocaleString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              
              {/* Agent First Response */}
              {conversation.first_response_at ? (
                <div className="flex items-start justify-between text-xs">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Agent respon
                  </span>
                  <span className="font-medium text-green-600">
                    {new Date(conversation.first_response_at).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              ) : (
                <div className="flex items-start justify-between text-xs">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Agent respon
                  </span>
                  <span className="font-medium text-orange-600">
                    Belum dibalas
                  </span>
                </div>
              )}
              
              {/* Conversation Closed */}
              {conversation.closed_at ? (
                <div className="flex items-start justify-between text-xs">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Chat selesai
                  </span>
                  <span className="font-medium text-blue-600">
                    {new Date(conversation.closed_at).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              ) : (
                <div className="flex items-start justify-between text-xs">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Chat selesai
                  </span>
                  <span className="font-medium text-gray-400">
                    Belum selesai
                  </span>
                </div>
              )}
            </div>

            {/* SLA Metrics - Durasi */}
            <div className="space-y-2 pt-2 border-t">
              <p className="text-[10px] font-semibold text-gray-700 mb-2">SLA Metrics</p>
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Response Time
                </span>
                <span className={`font-semibold ${
                  !conversation.first_response_at && slaTimer.responseTime > 30 
                    ? 'text-red-600' 
                    : 'text-green-600'
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
                  !conversation.closed_at && slaTimer.resolutionTime > 120 
                    ? 'text-red-600' 
                    : 'text-green-600'
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
                  conversation={conversation}
                  userRole={userRole}
                  currentUserId={currentUserId}
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
              onAutoAssign={onAutoAssignAgent}
              canHandover={!!onHandoverToAgent}
              canAssign={!!onAssignAgent}
              userRole={userRole}
            />
          </div>
        )}

        {/* Handover History */}
        <button
          onClick={() => toggleSection('handovers')}
          className="w-full px-6 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left group"
        >
          <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center group-hover:bg-cyan-100 transition-colors">
            <Users className="h-4 w-4 text-cyan-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Handover History</p>
          </div>
          {expandedSections.handovers ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {/* Handover History Content */}
        {expandedSections.handovers && (
          <div className="px-6 py-3 bg-gray-50">
            <HandoverHistory conversationId={conversation?.id} />
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
              onSelectConversation={onSelectConversation}
              onViewInModal={handleViewHistoryInModal}
              userRole={userRole}
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
            {/* Internal Notes Section */}
            <button
              onClick={() => toggleSection('notes')}
              className="w-full px-6 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Internal Notes</p>
                <p className="text-xs text-gray-500">Catatan untuk agent</p>
              </div>
              {notes.filter(n => 
                n.note_type === 'internal' || 
                (!n.note_type && !n.rating)
              ).length > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                  {notes.filter(n => 
                    n.note_type === 'internal' || 
                    (!n.note_type && !n.rating)
                  ).length}
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
                {/* Add Internal Note Form */}
                <InternalNoteForm onSave={(content) => onSaveNote(content, 0, 'internal')} />
                
                {/* Existing Internal Notes - Only show notes without rating or explicitly internal */}
                {notes.filter(n => 
                  n.note_type === 'internal' || 
                  (!n.note_type && !n.rating)
                ).length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    {notes
                      .filter(n => 
                        n.note_type === 'internal' || 
                        (!n.note_type && !n.rating)
                      )
                      .map((note) => (
                        <NoteCard key={note.id} note={note} defaultExpanded={true} />
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Rating & Review Section */}
            <button
              onClick={() => toggleSection('reviews')}
              className="w-full px-6 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left group border-t"
            >
              <div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center group-hover:bg-yellow-100 transition-colors">
                <Star className="h-4 w-4 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Rating & Review</p>
                <p className="text-xs text-gray-500">Feedback customer</p>
              </div>
              {notes.filter(n => 
                n.note_type === 'review' || 
                (!n.note_type && n.rating && n.rating > 0)
              ).length > 0 && (
                <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-medium">
                  {notes.filter(n => 
                    n.note_type === 'review' || 
                    (!n.note_type && n.rating && n.rating > 0)
                  ).length}
                </span>
              )}
              {expandedSections.reviews ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {expandedSections.reviews && (
              <div className="px-6 py-3 space-y-3 bg-gray-50">
                {/* Add Review Form */}
                <ReviewForm onSave={(content, rating) => onSaveNote(content, rating, 'review')} />
                
                {/* Existing Reviews - Filter by note_type='review' OR (no note_type AND has rating) */}
                {notes.filter(n => 
                  n.note_type === 'review' || 
                  (!n.note_type && n.rating && n.rating > 0)
                ).length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    {notes
                      .filter(n => 
                        n.note_type === 'review' || 
                        (!n.note_type && n.rating && n.rating > 0)
                      )
                      .map((note) => (
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

      {/* Conversation History Modal */}
      <ConversationHistoryModal
        conversationId={historyModalConversationId}
        onClose={() => {
          setShowHistoryModal(false)
          setHistoryModalConversationId(null)
        }}
      />
    </div>
  )
}
