// Chat feature types
import { Database } from '@/types/database.types'

// Database table types
export type Label = Database['public']['Tables']['labels']['Row']
export type LabelInsert = Database['public']['Tables']['labels']['Insert']
export type LabelUpdate = Database['public']['Tables']['labels']['Update']

export type ConversationLabel = Database['public']['Tables']['conversation_labels']['Row']
export type ConversationLabelInsert = Database['public']['Tables']['conversation_labels']['Insert']

export type ConversationNote = Database['public']['Tables']['conversation_notes']['Row']
export type ConversationNoteInsert = Database['public']['Tables']['conversation_notes']['Insert']
export type ConversationNoteUpdate = Database['public']['Tables']['conversation_notes']['Update']

export type QuickReply = Database['public']['Tables']['quick_replies']['Row']
export type QuickReplyInsert = Database['public']['Tables']['quick_replies']['Insert']
export type QuickReplyUpdate = Database['public']['Tables']['quick_replies']['Update']

export type ChatbotSession = Database['public']['Tables']['chatbot_sessions']['Row']
export type ChatbotSessionInsert = Database['public']['Tables']['chatbot_sessions']['Insert']
export type ChatbotSessionUpdate = Database['public']['Tables']['chatbot_sessions']['Update']

export type Conversation = Database['public']['Tables']['conversations']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type Contact = Database['public']['Tables']['contacts']['Row']
export type Chatbot = Database['public']['Tables']['chatbots']['Row']

// Workflow status types
export type WorkflowStatus = 'incoming' | 'waiting' | 'in_progress' | 'done'

export interface ConversationStatusHistory {
  id: string
  conversation_id: string
  from_status: WorkflowStatus | null
  to_status: WorkflowStatus
  changed_by: string | null
  changed_at: string
  duration_seconds: number | null
  notes: string | null
  created_at: string
}

export interface AgentWorkflowAnalytics {
  agent_id: string
  agent_email: string
  agent_name: string | null
  workflow_status: WorkflowStatus
  conversation_count: number
  avg_handling_time_seconds: number | null
  avg_first_response_time_seconds: number | null
  completed_count: number
  in_progress_count: number
  waiting_count: number
  incoming_count: number
}

// Media types
export type MediaType = 'image' | 'video' | 'audio' | 'document' | 'location' | 'vcard'

export interface MediaAsset {
  id: string
  message_id: string
  type: MediaType
  url: string
  filename: string
  size: number
  mime_type: string
  created_at: string
}

export interface MediaAttachment {
  file?: File
  type: MediaType
  preview?: string
  caption?: string // Caption text for media (like WhatsApp)
  // For location type
  latitude?: number
  longitude?: number
  address?: string
  name?: string
}

// Filter types
export type ConversationFilter = 'all' | 'read' | 'unread'

// Extended conversation with relations
export interface ConversationWithRelations extends Conversation {
  contact: Contact
  labels?: (ConversationLabel & { label: Label })[]
  notes?: ConversationNote[]
  chatbot_sessions?: (ChatbotSession & { chatbot: Chatbot })[]
}

// Extended message with relations
export interface MessageWithRelations extends Omit<Message, 'media_url' | 'media_type' | 'media_filename' | 'media_size' | 'media_mime_type'> {
  sent_by_user?: {
    id: string
    full_name: string | null
    email: string
    avatar_url: string | null
  }
  contact?: {
    id: string
    name: string | null
    phone_number: string
  }
  // Override media fields to allow undefined
  media_url?: string | null | undefined
  media_type?: MediaType | null | undefined
  media_filename?: string | null | undefined
  media_size?: number | null | undefined
  media_mime_type?: string | null | undefined
  // Quoted message
  quoted_message?: {
    id: string
    content: string | null
    sender_type: 'customer' | 'agent' | 'bot'
    is_from_me: boolean
    contact?: {
      name: string | null
      phone_number: string
    }
    sent_by_user?: {
      full_name: string | null
    }
  } | null
}

// Response window status
export interface ResponseWindowStatus {
  isExpired: boolean
  expiresAt: string | null
  timeRemaining: string | null
  warningShown: boolean
}

// Translation cache
export interface TranslationCache {
  [messageId: string]: string
}

// Quick reply variables
export interface QuickReplyVariables {
  [key: string]: string
}

// Chat state interfaces
export interface ConversationState {
  conversations: ConversationWithRelations[]
  selectedConversationId: string | null
  filter: ConversationFilter
  searchQuery: string
  loading: boolean
  error: string | null
}

export interface MessageState {
  messages: MessageWithRelations[]
  translations: TranslationCache
  sending: boolean
  loading: boolean
  error: string | null
}

export interface SidebarState {
  notes: ConversationNote[]
  labels: Label[]
  appliedLabels: (ConversationLabel & { label: Label })[]
  activeChatbots: (ChatbotSession & { chatbot: Chatbot })[]
  mediaAssets: MediaAsset[]
  selectedMediaType: MediaType | 'all'
  responseWindow: ResponseWindowStatus | null
  loading: boolean
  error: string | null
}

// API response types
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface SendMessageResponse {
  success: boolean
  messageId?: string
  error?: string
}

export interface UploadMediaResponse {
  success: boolean
  url?: string
  filename?: string
  size?: number
  error?: string
}

export interface TranslateMessageResponse {
  success: boolean
  translatedText?: string
  error?: string
}

// Supabase Realtime event types (migrated from Socket.IO)
export interface RealtimeMessageEvent {
  conversationId: string
  message: Message
}

export interface RealtimeConversationUpdatedEvent {
  conversationId: string
  updates: Partial<Conversation>
}

export interface RealtimeLabelEvent {
  conversationId: string
  label: Label
  labelId?: string
}

export interface RealtimeNoteEvent {
  conversationId: string
  note: ConversationNote
}

export interface RealtimeChatbotEvent {
  conversationId: string
  chatbotId: string
  isActive: boolean
}

export interface RealtimeResponseWindowEvent {
  conversationId: string
  expiresAt?: string
}

// Form types
export interface CreateLabelForm {
  name: string
  color: string
}

export interface SaveNoteForm {
  content: string
  rating: number | null
}

export interface CreateQuickReplyForm {
  title: string
  content: string
  category?: string
  variables?: QuickReplyVariables
}

// Validation types
export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}
