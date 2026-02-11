// Zustand store for chat management
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  ConversationWithRelations,
  MessageWithRelations,
  ConversationFilter,
  Label,
  ConversationLabel,
  ConversationNote,
  ChatbotSession,
  MediaAsset,
  MediaType,
  ResponseWindowStatus,
  TranslationCache,
  Chatbot,
} from '@/lib/types/chat'

interface ChatState {
  // Conversations
  conversations: ConversationWithRelations[]
  selectedConversationId: string | null
  filter: ConversationFilter
  searchQuery: string
  conversationsLoading: boolean
  conversationsError: string | null

  // Messages
  messages: MessageWithRelations[]
  translations: TranslationCache
  messagesLoading: boolean
  messagesSending: boolean
  messagesError: string | null

  // Sidebar
  notes: ConversationNote[]
  labels: Label[]
  appliedLabels: (ConversationLabel & { label: Label })[]
  activeChatbots: (ChatbotSession & { chatbot: Chatbot })[]
  mediaAssets: MediaAsset[]
  selectedMediaType: MediaType | 'all'
  responseWindow: ResponseWindowStatus | null
  sidebarLoading: boolean
  sidebarError: string | null

  // Actions - Conversations
  setConversations: (conversations: ConversationWithRelations[]) => void
  addConversation: (conversation: ConversationWithRelations) => void
  updateConversation: (id: string, updates: Partial<ConversationWithRelations>) => void
  selectConversation: (id: string | null) => void
  setFilter: (filter: ConversationFilter) => void
  setSearchQuery: (query: string) => void
  setConversationsLoading: (loading: boolean) => void
  setConversationsError: (error: string | null) => void

  // Actions - Messages
  setMessages: (messages: MessageWithRelations[]) => void
  addMessage: (message: MessageWithRelations) => void
  updateMessage: (id: string, updates: Partial<MessageWithRelations>) => void
  setTranslation: (messageId: string, translation: string) => void
  setMessagesLoading: (loading: boolean) => void
  setMessagesSending: (sending: boolean) => void
  setMessagesError: (error: string | null) => void

  // Actions - Sidebar
  setNotes: (notes: ConversationNote[]) => void
  addNote: (note: ConversationNote) => void
  setLabels: (labels: Label[]) => void
  addLabel: (label: Label) => void
  setAppliedLabels: (labels: (ConversationLabel & { label: Label })[]) => void
  addAppliedLabel: (label: ConversationLabel & { label: Label }) => void
  removeAppliedLabel: (labelId: string) => void
  setActiveChatbots: (chatbots: (ChatbotSession & { chatbot: Chatbot })[]) => void
  updateChatbotSession: (id: string, updates: Partial<ChatbotSession>) => void
  setMediaAssets: (assets: MediaAsset[]) => void
  setSelectedMediaType: (type: MediaType | 'all') => void
  setResponseWindow: (status: ResponseWindowStatus | null) => void
  setSidebarLoading: (loading: boolean) => void
  setSidebarError: (error: string | null) => void

  // Computed selectors
  getFilteredConversations: () => ConversationWithRelations[]
  getSelectedConversation: () => ConversationWithRelations | null
  getFilteredMediaAssets: () => MediaAsset[]
}

export const useChatStore = create<ChatState>()(
  devtools(
    (set, get) => ({
      // Initial state - Conversations
      conversations: [],
      selectedConversationId: null,
      filter: 'all',
      searchQuery: '',
      conversationsLoading: false,
      conversationsError: null,

      // Initial state - Messages
      messages: [],
      translations: {},
      messagesLoading: false,
      messagesSending: false,
      messagesError: null,

      // Initial state - Sidebar
      notes: [],
      labels: [],
      appliedLabels: [],
      activeChatbots: [],
      mediaAssets: [],
      selectedMediaType: 'all',
      responseWindow: null,
      sidebarLoading: false,
      sidebarError: null,

      // Actions - Conversations
      setConversations: (conversations) => set({ conversations }),
      
      addConversation: (conversation) =>
        set((state) => ({
          conversations: [conversation, ...state.conversations],
        })),

      updateConversation: (id, updates) =>
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === id ? { ...conv, ...updates } : conv
          ),
        })),

      selectConversation: (id) => set({ selectedConversationId: id }),

      setFilter: (filter) => set({ filter }),

      setSearchQuery: (query) => set({ searchQuery: query }),

      setConversationsLoading: (loading) => set({ conversationsLoading: loading }),

      setConversationsError: (error) => set({ conversationsError: error }),

      // Actions - Messages
      setMessages: (messages) => set({ messages }),

      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),

      updateMessage: (id, updates) =>
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, ...updates } : msg
          ),
        })),

      setTranslation: (messageId, translation) =>
        set((state) => ({
          translations: {
            ...state.translations,
            [messageId]: translation,
          },
        })),

      setMessagesLoading: (loading) => set({ messagesLoading: loading }),

      setMessagesSending: (sending) => set({ messagesSending: sending }),

      setMessagesError: (error) => set({ messagesError: error }),

      // Actions - Sidebar
      setNotes: (notes) => set({ notes }),

      addNote: (note) =>
        set((state) => ({
          notes: [note, ...state.notes],
        })),

      setLabels: (labels) => set({ labels }),

      addLabel: (label) =>
        set((state) => ({
          labels: [...state.labels, label],
        })),

      setAppliedLabels: (labels) => set({ appliedLabels: labels }),

      addAppliedLabel: (label) =>
        set((state) => ({
          appliedLabels: [...state.appliedLabels, label],
        })),

      removeAppliedLabel: (labelId) =>
        set((state) => ({
          appliedLabels: state.appliedLabels.filter((l) => l.label_id !== labelId),
        })),

      setActiveChatbots: (chatbots) => set({ activeChatbots: chatbots }),

      updateChatbotSession: (id, updates) =>
        set((state) => ({
          activeChatbots: state.activeChatbots.map((session) =>
            session.id === id ? { ...session, ...updates } : session
          ),
        })),

      setMediaAssets: (assets) => set({ mediaAssets: assets }),

      setSelectedMediaType: (type) => set({ selectedMediaType: type }),

      setResponseWindow: (status) => set({ responseWindow: status }),

      setSidebarLoading: (loading) => set({ sidebarLoading: loading }),

      setSidebarError: (error) => set({ sidebarError: error }),

      // Computed selectors
      getFilteredConversations: () => {
        const { conversations, filter, searchQuery } = get()
        
        let filtered = conversations

        // Apply filter
        if (filter === 'read') {
          filtered = filtered.filter((conv) => conv.read_status === 'read')
        } else if (filter === 'unread') {
          filtered = filtered.filter((conv) => conv.read_status === 'unread')
        }

        // Apply search
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase()
          filtered = filtered.filter((conv) => {
            // Search in contact name
            if (conv.contact?.name?.toLowerCase().includes(query)) {
              return true
            }
            // Search in phone number
            if (conv.contact?.phone_number?.includes(query)) {
              return true
            }
            // Search in last message
            if (conv.last_message?.toLowerCase().includes(query)) {
              return true
            }
            return false
          })
        }

        return filtered
      },

      getSelectedConversation: () => {
        const { conversations, selectedConversationId } = get()
        return conversations.find((conv) => conv.id === selectedConversationId) || null
      },

      getFilteredMediaAssets: () => {
        const { mediaAssets, selectedMediaType } = get()
        
        if (selectedMediaType === 'all') {
          return mediaAssets
        }
        
        return mediaAssets.filter((asset) => asset.type === selectedMediaType)
      },
    }),
    { name: 'ChatStore' }
  )
)
