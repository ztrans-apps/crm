// Chat feature types
export type FilterType = 'inbox' | 'assigned' | 'resolved'

export interface Conversation {
  id: string
  contact: {
    name: string | null
    phone_number: string
  }
  last_message: string | null
  last_message_at: string
  status: 'open' | 'closed'
  read_status: 'read' | 'unread'
  unread_count: number
  assigned_to: string | null
  workflow_status?: 'incoming' | 'waiting' | 'in_progress' | 'done'
  labels?: Array<{ id: string; name: string; color: string | null }>
}

export interface ConversationListProps {
  conversations: Conversation[]
  selectedId: string | null
  onSelect: (id: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  loading?: boolean
  onPickConversation?: (conversationId: string) => void
  currentUserId?: string | null
  userRole: 'owner' | 'agent' | 'supervisor'
}

export interface RightSidebarProps {
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
