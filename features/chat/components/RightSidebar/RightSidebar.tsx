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
  userRole: string
  isLimitedView?: boolean
  hasManagePermission?: boolean
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
  isLimitedView = false,
  hasManagePermission = false,
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
      <div className="w-80 border-l border-vx-border bg-vx-surface flex items-center justify-center p-4">
        <p className="text-sm text-vx-text-muted">Pilih conversation untuk melihat detail</p>
      </div>
    )
  }

  const isContactSaved = conversation?.contact?.name && conversation.contact.name.trim() !== ''

  return (
    <div className="w-80 border-l border-vx-border bg-vx-surface flex flex-col h-full">
      {/* Header - Compact Design with Frame */}
      <div className="bg-vx-surface-elevated p-4">
        {/* Contact Details Frame - Avatar + Info */}
        <div className="mx-auto max-w-sm border border-vx-border rounded-2xl overflow-hidden bg-vx-surface vx-shadow-sm">
          {/* Large Avatar - Inside Frame */}
          <div className="py-6 px-4 flex justify-center bg-vx-surface-elevated">
            <div className="w-24 h-24 rounded-full border-4 border-vx-purple/30 bg-vx-surface flex items-center justify-center">
              <div className="w-20 h-20 rounded-full vx-gradient flex items-center justify-center text-white text-3xl font-semibold">
                {getAvatarInitial()}
              </div>
            </div>
          </div>

          {/* Contact Details - Sender and Mobile */}
          <div className="px-4 py-4 space-y-3 bg-vx-surface">
            {/* Sender - With Edit */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-vx-purple/10 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-vx-purple" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-vx-text-muted mb-0.5">Sender:</p>
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
                      className="p-1 hover:bg-vx-teal/10 rounded text-vx-teal shrink-0"
                    >
                      <Save className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingContact(false)
                        setContactName(conversation?.contact?.name || '')
                      }}
                      className="p-1 hover:bg-vx-surface-hover rounded text-vx-text-muted shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-vx-text truncate">
                      {contactName || conversation?.contact?.phone_number || 'Unknown'}
                    </p>
                    {canEditContact && (
                      <button
                        onClick={() => setEditingContact(true)}
                        className="p-0.5 hover:bg-vx-surface-hover rounded text-vx-text-muted hover:text-vx-text shrink-0"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-vx-border"></div>

            {/* Mobile */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-vx-teal/10 flex items-center justify-center shrink-0">
                <Phone className="h-4 w-4 text-vx-teal" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-vx-text-muted mb-0.5">Mobile:</p>
                <p className="text-sm font-semibold text-vx-text truncate">
                  {conversation?.contact?.phone_number || '-'}
                </p>
              </div>
            </div>
          </div>
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
      <div className="flex-1 overflow-y-auto py-2 vx-scrollbar">
        {/* Profile Section */}
        <button
          onClick={() => {
            setContactDetailEditMode(false)
            setShowContactDetail(true)
          }}
          className="w-full px-6 py-3 flex items-center gap-3 hover:bg-vx-surface-hover transition-colors text-left group"
        >
          <div className="w-8 h-8 rounded-lg bg-vx-purple/10 flex items-center justify-center group-hover:bg-vx-purple/20 transition-colors">
            <User className="h-4 w-4 text-vx-purple" />
          </div>
          <div className="flex-1 flex items-center gap-2">
            <p className="text-sm font-medium text-vx-text">Profile</p>
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
          className="w-full px-6 py-3 flex items-center gap-3 hover:bg-vx-surface-hover transition-colors text-left group"
        >
          <div className="w-8 h-8 rounded-lg bg-vx-surface-hover flex items-center justify-center group-hover:bg-vx-purple/10 transition-colors">
            <FileText className="h-4 w-4 text-vx-text-secondary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-vx-text">Details Progress</p>
          </div>
          {expandedSections.details ? (
            <ChevronUp className="h-4 w-4 text-vx-text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-vx-text-muted" />
          )}
        </button>

        {/* Details Content */}
        {expandedSections.details && (
          <div className="px-6 py-3 space-y-4 bg-vx-surface-elevated">
            {/* WhatsApp Session Info */}
            {conversation.whatsapp_session && (
              <div className="space-y-2 pb-2 border-b">
                <p className="text-[10px] font-semibold text-vx-text-secondary mb-2">WhatsApp Session</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-vx-text-secondary flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Nomor WhatsApp
                  </span>
                  <span className="font-medium text-vx-text">
                    {conversation.whatsapp_session.phone_number || 'Connecting...'}
                  </span>
                </div>
                {conversation.whatsapp_session.session_name && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-vx-text-secondary flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      Device Name
                    </span>
                    <span className="font-medium text-vx-text">
                      {conversation.whatsapp_session.session_name}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-vx-text-secondary flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Status
                  </span>
                  <span className={`font-medium ${
                    conversation.whatsapp_session.status === 'connected' 
                      ? 'text-green-600' 
                      : conversation.whatsapp_session.status === 'connecting'
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}>
                    {conversation.whatsapp_session.status === 'connected' ? 'Connected' : 
                     conversation.whatsapp_session.status === 'connecting' ? 'Connecting' : 
                     'Disconnected'}
                  </span>
                </div>
              </div>
            )}
            
            {/* Timeline - Waktu Penting */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-vx-text-secondary mb-2">Timeline</p>
              
              {/* Customer First Message */}
              <div className="flex items-start justify-between text-xs">
                <span className="text-vx-text-secondary flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Customer kirim pesan
                </span>
                <span className="font-medium text-vx-text">
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
                  <span className="text-vx-text-secondary flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Agent respon
                  </span>
                  <span className="font-medium text-vx-teal">
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
                  <span className="text-vx-text-secondary flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Agent respon
                  </span>
                  <span className="font-medium text-orange-600 dark:text-orange-400">
                    Belum dibalas
                  </span>
                </div>
              )}
              
              {/* Conversation Closed */}
              {conversation.closed_at ? (
                <div className="flex items-start justify-between text-xs">
                  <span className="text-vx-text-secondary flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Chat selesai
                  </span>
                  <span className="font-medium text-vx-purple">
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
                  <span className="text-vx-text-secondary flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Chat selesai
                  </span>
                  <span className="font-medium text-vx-text-muted">
                    Belum selesai
                  </span>
                </div>
              )}
            </div>

            {/* SLA Metrics - Durasi */}
            <div className="space-y-2 pt-2 border-t border-vx-border">
              <p className="text-[10px] font-semibold text-vx-text-secondary mb-2">SLA Metrics</p>
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-vx-text-secondary flex items-center gap-1">
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
                <span className="text-vx-text-secondary flex items-center gap-1">
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
              <div className="pt-2 border-t border-vx-border">
                <WorkflowStatus
                  conversationId={conversation?.id}
                  currentStatus={conversation?.workflow_status || 'incoming'}
                  onStatusChanged={onStatusChanged}
                  conversation={conversation}
                  userRole={userRole}
                  currentUserId={currentUserId}
                  isLimitedView={isLimitedView}
                />
              </div>
            )}
          </div>
        )}

        {/* Assign Agent */}
        <button
          onClick={() => toggleSection('agents')}
          className="w-full px-6 py-3 flex items-center gap-3 hover:bg-vx-surface-hover transition-colors text-left group"
        >
          <div className="w-8 h-8 rounded-lg bg-vx-purple/10 flex items-center justify-center group-hover:bg-vx-purple/20 transition-colors">
            <Users className="h-4 w-4 text-vx-purple" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-vx-text">Assign Agent</p>
          </div>
          {expandedSections.agents ? (
            <ChevronUp className="h-4 w-4 text-vx-text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-vx-text-muted" />
          )}
        </button>

        {/* Agent Assignment Content */}
        {expandedSections.agents && (
          <div className="px-6 py-3 bg-vx-surface-elevated">
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
              hasManagePermission={hasManagePermission}
            />
          </div>
        )}

        {/* Handover History */}
        <button
          onClick={() => toggleSection('handovers')}
          className="w-full px-6 py-3 flex items-center gap-3 hover:bg-vx-surface-hover transition-colors text-left group"
        >
          <div className="w-8 h-8 rounded-lg bg-vx-cyan/10 flex items-center justify-center group-hover:bg-vx-cyan/20 transition-colors">
            <Users className="h-4 w-4 text-vx-cyan" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-vx-text">Handover History</p>
          </div>
          {expandedSections.handovers ? (
            <ChevronUp className="h-4 w-4 text-vx-text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-vx-text-muted" />
          )}
        </button>

        {/* Handover History Content */}
        {expandedSections.handovers && (
          <div className="px-6 py-3 bg-vx-surface-elevated">
            <HandoverHistory conversationId={conversation?.id} />
          </div>
        )}

        {/* Conversation History */}
        <button
          onClick={() => toggleSection('history')}
          className="w-full px-6 py-3 flex items-center gap-3 hover:bg-vx-surface-hover transition-colors text-left group"
        >
          <div className="w-8 h-8 rounded-lg bg-vx-purple/10 flex items-center justify-center group-hover:bg-vx-purple/20 transition-colors">
            <MessageSquare className="h-4 w-4 text-vx-purple" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-vx-text">Conversation History</p>
          </div>
          {expandedSections.history ? (
            <ChevronUp className="h-4 w-4 text-vx-text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-vx-text-muted" />
          )}
        </button>

        {/* Conversation History Content */}
        {expandedSections.history && (
          <div className="px-6 py-3 bg-vx-surface-elevated">
            <ConversationHistory
              contactId={conversation?.contact?.id}
              currentConversationId={conversation?.id}
              onSelectConversation={onSelectConversation}
              onViewInModal={handleViewHistoryInModal}
              userRole={userRole}
              isLimitedView={isLimitedView}
            />
          </div>
        )}

        {/* Chat Labels */}
        {canApplyLabel && (
          <>
            <button
              onClick={() => toggleSection('labels')}
              className="w-full px-6 py-3 flex items-center gap-3 hover:bg-vx-surface-hover transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-100 dark:group-hover:bg-orange-500/20 transition-colors">
                <Tag className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-vx-text">Chat Labels</p>
              </div>
              {appliedLabels.length > 0 && (
                <span className="bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 text-xs px-2 py-0.5 rounded-full font-medium">
                  {appliedLabels.length}
                </span>
              )}
              {expandedSections.labels ? (
                <ChevronUp className="h-4 w-4 text-vx-text-muted" />
              ) : (
                <ChevronDown className="h-4 w-4 text-vx-text-muted" />
              )}
            </button>

            {expandedSections.labels && (
              <div className="px-6 py-3 bg-vx-surface-elevated">
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
              className="w-full px-6 py-3 flex items-center gap-3 hover:bg-vx-surface-hover transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-vx-purple/10 flex items-center justify-center group-hover:bg-vx-purple/20 transition-colors">
                <FileText className="h-4 w-4 text-vx-purple" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-vx-text">Internal Notes</p>
                <p className="text-xs text-vx-text-muted">Catatan untuk agent</p>
              </div>
              {notes.filter(n => 
                n.note_type === 'internal' || 
                (!n.note_type && !n.rating)
              ).length > 0 && (
                <span className="bg-vx-purple/10 text-vx-purple text-xs px-2 py-0.5 rounded-full font-medium">
                  {notes.filter(n => 
                    n.note_type === 'internal' || 
                    (!n.note_type && !n.rating)
                  ).length}
                </span>
              )}
              {expandedSections.notes ? (
                <ChevronUp className="h-4 w-4 text-vx-text-muted" />
              ) : (
                <ChevronDown className="h-4 w-4 text-vx-text-muted" />
              )}
            </button>

            {expandedSections.notes && (
              <div className="px-6 py-3 space-y-3 bg-vx-surface-elevated">
                {/* Add Internal Note Form */}
                <InternalNoteForm onSave={(content) => onSaveNote(content, 0, 'internal')} />
                
                {/* Existing Internal Notes - Only show notes without rating or explicitly internal */}
                {notes.filter(n => 
                  n.note_type === 'internal' || 
                  (!n.note_type && !n.rating)
                ).length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-vx-border">
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
              className="w-full px-6 py-3 flex items-center gap-3 hover:bg-vx-surface-hover transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-yellow-50 dark:bg-yellow-500/10 flex items-center justify-center group-hover:bg-yellow-100 dark:group-hover:bg-yellow-500/20 transition-colors">
                <Star className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-vx-text">Rating & Review</p>
                <p className="text-xs text-vx-text-muted">Feedback customer</p>
              </div>
              {notes.filter(n => 
                n.note_type === 'review' || 
                (!n.note_type && n.rating && n.rating > 0)
              ).length > 0 && (
                <span className="bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 text-xs px-2 py-0.5 rounded-full font-medium">
                  {notes.filter(n => 
                    n.note_type === 'review' || 
                    (!n.note_type && n.rating && n.rating > 0)
                  ).length}
                </span>
              )}
              {expandedSections.reviews ? (
                <ChevronUp className="h-4 w-4 text-vx-text-muted" />
              ) : (
                <ChevronDown className="h-4 w-4 text-vx-text-muted" />
              )}
            </button>

            {expandedSections.reviews && (
              <div className="px-6 py-3 space-y-3 bg-vx-surface-elevated">
                {/* Add Review Form */}
                <ReviewForm onSave={(content, rating) => onSaveNote(content, rating, 'review')} />
                
                {/* Existing Reviews - Filter by note_type='review' OR (no note_type AND has rating) */}
                {notes.filter(n => 
                  n.note_type === 'review' || 
                  (!n.note_type && n.rating && n.rating > 0)
                ).length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-vx-border">
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
