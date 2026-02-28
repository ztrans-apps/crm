// Unified Chat Page - Works for both Owner and Agent (Refactored)
'use client'

import { useState, useEffect, useCallback } from 'react'
import { chatService } from '@/features/chat/services'
import type { QuickReply } from '@/lib/types/chat'
import { AuthGuard } from '@/core/auth'
import { PermissionGuard } from '@/lib/rbac/components/PermissionGuard';
import { ArrowLeft, PanelRightOpen } from 'lucide-react'
import { toast } from '@/lib/stores/toast-store'

// Import hooks
import { useChat, useMessages, usePermissions } from '@/features/chat/hooks'

// Import components
import { ConversationList, RightSidebar, ChatWindow, QuickRepliesModal } from '@/features/chat/components'

export default function UnifiedChatsPage() {
  return (
    <AuthGuard>
      <PermissionGuard 
        permission={['chat.view']}
        fallback={
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Anda tidak memiliki akses ke halaman ini.</p>
          </div>
        }
      >
        <UnifiedChatsContent />
      </PermissionGuard>
    </AuthGuard>
  )
}

function UnifiedChatsContent() {
  // Use custom hooks
  const {
    filteredConversations,
    selectedConversation,
    selectedConversationId,
    setSelectedConversationId,
    userId,
    userRole,
    sessionId,
    searchQuery,
    setSearchQuery,
    loading: conversationsLoading,
    refreshConversations,
  } = useChat()

  const { conversationActions, permissions, userPermissions } = usePermissions({
    role: userRole,
    userId,
    conversation: selectedConversation,
  })

  const {
    messages,
    messageInput,
    setMessageInput,
    translations,
    translating,
    sending: messagesSending,
    loading: messagesLoading,
    loadingMore,
    hasMore,
    handleSendMessage,
    handleTranslate,
    markAsRead,
    loadMoreMessages,
  } = useMessages({
    conversationId: selectedConversationId,
    sessionId,
    userId,
    onConversationsRefresh: refreshConversations,
    canSendMessage: conversationActions.canSendMessage,
  })

  // Local state
  const [notes, setNotes] = useState<any[]>([])
  const [appliedLabels, setAppliedLabels] = useState<any[]>([])
  const [availableLabels, setAvailableLabels] = useState<any[]>([])
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [showQuickReplies, setShowQuickReplies] = useState(false)

  // Mobile responsive state
  const [mobileView, setMobileView] = useState<'list' | 'chat' | 'info'>('list')
  const [showRightSidebar, setShowRightSidebar] = useState(false)

  // When a conversation is selected on mobile, switch to chat view
  const handleMobileSelect = useCallback((id: string) => {
    setSelectedConversationId(id)
    setMobileView('chat')
  }, [setSelectedConversationId])

  // Back to list on mobile
  const handleMobileBack = useCallback(() => {
    setMobileView('list')
    setSelectedConversationId(null)
  }, [setSelectedConversationId])

  // Load sidebar data when conversation changes
  const loadSidebarData = async (convId: string) => {
    // Reset notes first to avoid showing old data
    setNotes([])
    setAppliedLabels([])
    
    try {
      const [notesData, labelsData, allLabelsData] = await Promise.all([
        chatService.getNotes(convId),
        chatService.getConversationLabels(convId),
        chatService.getAllLabels(),
      ])
      
      setNotes(notesData)
      setAppliedLabels(labelsData)
      setAvailableLabels(allLabelsData)
    } catch (error) {
      console.error('Error loading sidebar data:', error)
    }
  }

  // Load quick replies
  const loadQuickReplies = async () => {
    try {
      const data = await chatService.getAllQuickReplies()
      setQuickReplies(data)
    } catch (error) {
      console.error('Error loading quick replies:', error)
    }
  }

  // Initialize quick replies when component mounts
  useEffect(() => {
    loadQuickReplies()
  }, [])

  // Load sidebar data when conversation changes
  useEffect(() => {
    if (selectedConversationId) {
      loadSidebarData(selectedConversationId)
    }
  }, [selectedConversationId])

  const handleChatWindowClick = () => {
    if (selectedConversationId) {
      markAsRead(selectedConversationId)
    }
  }

  const handleSaveNote = async (content: string, rating: number | null, noteType?: 'internal' | 'review') => {
    if (!selectedConversation || !userId) {
      toast.error('Cannot save note')
      return
    }

    try {
      await chatService.saveNote(selectedConversation.id, content, rating, userId, noteType)
      await loadSidebarData(selectedConversation.id)
    } catch (error: any) {
      toast.error('Failed to save note: ' + error.message)
    }
  }

  const handleQuickReplySelect = (content: string) => {
    setMessageInput(content)
    setShowQuickReplies(false)
  }

  const handlePickConversation = async (conversationId: string) => {
    if (!userId) return

    try {
      await chatService.conversations.pickConversation(conversationId, userId)
      await refreshConversations()
      setSelectedConversationId(conversationId)
      toast.success('Obrolan berhasil diambil!')
    } catch (error: any) {
      toast.error('Gagal mengambil obrolan: ' + error.message)
    }
  }

  const handleUpdateContact = async (contactId: string, name: string, customFields: any) => {
    try {
      await chatService.contacts.updateContact(contactId, name, customFields)
      await refreshConversations()
    } catch (error: any) {
      throw error
    }
  }

  const handleHandoverToAgent = async (conversationId: string, toAgentId: string) => {
    if (!userId) return

    try {
      await chatService.conversations.handoverConversation(conversationId, userId, toAgentId, 'Manual handover')
      await refreshConversations()
      setSelectedConversationId(null)
    } catch (error: any) {
      throw error
    }
  }

  const handleAssignAgent = async (agentId: string) => {
    if (!selectedConversation) return

    try {
      await chatService.conversations.assignConversation(selectedConversation.id, agentId)
      await refreshConversations()
    } catch (error: any) {
      toast.error('Failed to assign agent: ' + error.message)
    }
  }

  const handleAutoAssignAgent = async (conversationId: string) => {
    try {
      const { assignmentService } = await import('@/features/chat/services/assignment.service')
      const result = await assignmentService.autoAssignConversation(conversationId, 'round_robin')
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to auto-assign agent')
      }
      
      await refreshConversations()
    } catch (error: any) {
      throw error
    }
  }

  const handleApplyLabel = async (labelId: string) => {
    if (!selectedConversation || !userId) return

    try {
      await chatService.applyLabel(selectedConversation.id, labelId, userId)
      await loadSidebarData(selectedConversation.id)
      await refreshConversations()
    } catch (error: any) {
      toast.error('Failed to apply label: ' + error.message)
    }
  }

  const handleRemoveLabel = async (labelId: string) => {
    if (!selectedConversation) return

    try {
      await chatService.removeLabel(selectedConversation.id, labelId)
      await loadSidebarData(selectedConversation.id)
      await refreshConversations()
    } catch (error: any) {
      toast.error('Failed to remove label: ' + error.message)
    }
  }

  const handleCloseConversation = async () => {
    if (!selectedConversation || !userId) return

    if (!confirm('Yakin ingin menutup conversation ini?')) return

    try {
      await chatService.conversations.closeConversation(selectedConversation.id, userId)
      await refreshConversations()
    } catch (error: any) {
      toast.error('Failed to close conversation: ' + error.message)
    }
  }

  const handleSelectConversation = async (conversationId: string) => {
    // This is for owner/supervisor jumping to open conversations
    // For agents viewing closed conversations, modal will be used instead
    setSelectedConversationId(conversationId)
    await loadSidebarData(conversationId)
  }

  return (
    <div className="h-full flex relative overflow-hidden">
      {/* Left Sidebar - Conversation List */}
      <div className={`
        w-full md:w-80 lg:w-96 shrink-0
        ${mobileView !== 'list' ? 'hidden md:block' : 'block'}
      `}>
        <ConversationList
          conversations={filteredConversations}
          selectedId={selectedConversationId}
          onSelect={(id) => {
            setSelectedConversationId(id)
            // On mobile, switch to chat view
            setMobileView('chat')
          }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          loading={conversationsLoading}
          onPickConversation={!permissions.canViewAllConversations ? handlePickConversation : undefined}
          currentUserId={userId}
          userRole={userRole}
          isLimitedView={!permissions.canViewAllConversations}
        />
      </div>

      {/* Center - Chat Window */}
      <div className={`
        flex-1 min-w-0 flex flex-col
        ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}
      `}>
        {/* Mobile back button header */}
        {mobileView === 'chat' && selectedConversation && (
          <div className="md:hidden flex items-center gap-2 px-3 py-2 bg-vx-surface border-b border-vx-border">
            <button
              onClick={handleMobileBack}
              className="p-1.5 -ml-1 rounded-lg hover:bg-vx-surface-hover text-vx-text-secondary transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium text-vx-text truncate">
              {selectedConversation.contact?.name || selectedConversation.contact?.phone_number || 'Chat'}
            </span>
            <button
              onClick={() => setShowRightSidebar(true)}
              className="ml-auto p-1.5 rounded-lg hover:bg-vx-surface-hover text-vx-text-secondary transition-colors"
            >
              <PanelRightOpen className="h-5 w-5" />
            </button>
          </div>
        )}
        <ChatWindow
          conversation={selectedConversation}
          messages={messages}
          messageInput={messageInput}
          onMessageInputChange={setMessageInput}
          onSendMessage={(media, replyTo) => handleSendMessage(selectedConversation, media, replyTo)}
          onQuickReplyClick={() => setShowQuickReplies(true)}
          onRefresh={() => selectedConversationId && loadSidebarData(selectedConversationId)}
          onChatWindowClick={handleChatWindowClick}
          translations={translations}
          onTranslate={handleTranslate}
          translating={translating}
          sending={messagesSending}
          loading={messagesLoading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          onLoadMore={loadMoreMessages}
          disabled={!conversationActions.canSendMessage}
        />
      </div>

      {/* Right Sidebar - Desktop: inline, Mobile: overlay */}
      {selectedConversation && (
        <>
          {/* Desktop right sidebar */}
          <div className="hidden lg:block">
            <RightSidebar
              conversation={selectedConversation}
              notes={notes}
              appliedLabels={appliedLabels}
              availableLabels={availableLabels}
              onSaveNote={handleSaveNote}
              onUpdateContact={handleUpdateContact}
              onHandoverToAgent={conversationActions.canHandover ? handleHandoverToAgent : undefined}
              onAssignAgent={conversationActions.canAssign ? handleAssignAgent : undefined}
              onAutoAssignAgent={conversationActions.canAssign ? handleAutoAssignAgent : undefined}
              onApplyLabel={handleApplyLabel}
              onRemoveLabel={handleRemoveLabel}
              onCloseConversation={conversationActions.canClose ? handleCloseConversation : undefined}
              onSelectConversation={handleSelectConversation}
              onStatusChanged={refreshConversations}
              currentUserId={userId}
              userRole={userRole}
              isLimitedView={!permissions.canViewAllConversations}
              hasManagePermission={permissions.canManageAgents}
              canEditContact={permissions.canEditContact}
              canApplyLabel={permissions.canApplyLabel}
              canCreateNote={permissions.canCreateNote}
              canChangeStatus={permissions.canChangeWorkflowStatus}
            />
          </div>

          {/* Mobile/Tablet right sidebar overlay */}
          {showRightSidebar && (
            <div className="lg:hidden fixed inset-0 z-50 flex">
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setShowRightSidebar(false)}
              />
              {/* Sidebar panel - slides in from right */}
              <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] animate-in slide-in-from-right duration-300">
                <RightSidebar
                  conversation={selectedConversation}
                  notes={notes}
                  appliedLabels={appliedLabels}
                  availableLabels={availableLabels}
                  onSaveNote={handleSaveNote}
                  onUpdateContact={handleUpdateContact}
                  onHandoverToAgent={conversationActions.canHandover ? handleHandoverToAgent : undefined}
                  onAssignAgent={conversationActions.canAssign ? handleAssignAgent : undefined}
                  onAutoAssignAgent={conversationActions.canAssign ? handleAutoAssignAgent : undefined}
                  onApplyLabel={handleApplyLabel}
                  onRemoveLabel={handleRemoveLabel}
                  onCloseConversation={conversationActions.canClose ? handleCloseConversation : undefined}
                  onSelectConversation={handleSelectConversation}
                  onStatusChanged={refreshConversations}
                  currentUserId={userId}
                  userRole={userRole}
                  isLimitedView={!permissions.canViewAllConversations}
                  hasManagePermission={permissions.canManageAgents}
                  canEditContact={permissions.canEditContact}
                  canApplyLabel={permissions.canApplyLabel}
                  canCreateNote={permissions.canCreateNote}
                  canChangeStatus={permissions.canChangeWorkflowStatus}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Quick Replies Modal */}
      <QuickRepliesModal
        open={showQuickReplies}
        onClose={() => setShowQuickReplies(false)}
        quickReplies={quickReplies}
        onSelect={handleQuickReplySelect}
        contactName={selectedConversation?.contact?.name || 'Customer'}
      />
    </div>
  )
}
