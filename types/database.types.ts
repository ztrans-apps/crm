// types/database.types.ts
// Database types generated from Supabase schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'owner' | 'agent'
          full_name: string
          phone: string | null
          avatar_url: string | null
          is_active: boolean
          last_seen_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role: 'owner' | 'agent'
          full_name: string
          phone?: string | null
          avatar_url?: string | null
          is_active?: boolean
          last_seen_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'owner' | 'agent'
          full_name?: string
          phone?: string | null
          avatar_url?: string | null
          is_active?: boolean
          last_seen_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      whatsapp_sessions: {
        Row: {
          id: string
          user_id: string
          tenant_id: string | null
          phone_number: string
          session_name: string
          qr_code: string | null
          status: 'connected' | 'disconnected' | 'connecting'
          meta_phone_number_id: string | null
          meta_verified_name: string | null
          meta_quality_rating: string | null
          metadata: Json
          last_connected_at: string | null
          last_activity: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tenant_id?: string | null
          phone_number: string
          session_name: string
          qr_code?: string | null
          status?: 'connected' | 'disconnected' | 'connecting'
          meta_phone_number_id?: string | null
          meta_verified_name?: string | null
          meta_quality_rating?: string | null
          metadata?: Json
          last_connected_at?: string | null
          last_activity?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tenant_id?: string | null
          phone_number?: string
          session_name?: string
          qr_code?: string | null
          status?: 'connected' | 'disconnected' | 'connecting'
          meta_phone_number_id?: string | null
          meta_verified_name?: string | null
          meta_quality_rating?: string | null
          metadata?: Json
          last_connected_at?: string | null
          last_activity?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      contacts: {
        Row: {
          id: string
          user_id: string
          phone_number: string
          name: string | null
          email: string | null
          avatar_url: string | null
          tags: string[] | null
          notes: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          phone_number: string
          name?: string | null
          email?: string | null
          avatar_url?: string | null
          tags?: string[] | null
          notes?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          phone_number?: string
          name?: string | null
          email?: string | null
          avatar_url?: string | null
          tags?: string[] | null
          notes?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          whatsapp_session_id: string
          contact_id: string
          last_message: string | null
          last_message_at: string | null
          unread_count: number
          status: 'open' | 'closed'
          assigned_to: string | null
          read_status: 'read' | 'unread'
          response_window_expires_at: string | null
          closed_at: string | null
          closed_by: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          whatsapp_session_id: string
          contact_id: string
          last_message?: string | null
          last_message_at?: string | null
          unread_count?: number
          status?: 'open' | 'closed'
          assigned_to?: string | null
          read_status?: 'read' | 'unread'
          response_window_expires_at?: string | null
          closed_at?: string | null
          closed_by?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          whatsapp_session_id?: string
          contact_id?: string
          last_message?: string | null
          last_message_at?: string | null
          unread_count?: number
          status?: 'open' | 'closed'
          assigned_to?: string | null
          read_status?: 'read' | 'unread'
          response_window_expires_at?: string | null
          closed_at?: string | null
          closed_by?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_type: 'customer' | 'agent' | 'bot'
          sender_id: string | null
          message_type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location'
          content: string | null
          media_url: string | null
          media_type: 'image' | 'video' | 'audio' | 'document' | 'location' | 'vcard' | null
          media_filename: string | null
          media_size: number | null
          media_mime_type: string | null
          status: 'sent' | 'delivered' | 'read' | 'failed'
          is_from_me: boolean
          whatsapp_message_id: string | null
          quoted_message_id: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_type: 'customer' | 'agent' | 'bot'
          sender_id?: string | null
          message_type?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location'
          content?: string | null
          media_url?: string | null
          media_type?: 'image' | 'video' | 'audio' | 'document' | 'location' | 'vcard' | null
          media_filename?: string | null
          media_size?: number | null
          media_mime_type?: string | null
          status?: 'sent' | 'delivered' | 'read' | 'failed'
          is_from_me?: boolean
          whatsapp_message_id?: string | null
          quoted_message_id?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_type?: 'customer' | 'agent' | 'bot'
          sender_id?: string | null
          message_type?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location'
          content?: string | null
          media_url?: string | null
          media_type?: 'image' | 'video' | 'audio' | 'document' | 'location' | 'vcard' | null
          media_filename?: string | null
          media_size?: number | null
          media_mime_type?: string | null
          status?: 'sent' | 'delivered' | 'read' | 'failed'
          is_from_me?: boolean
          whatsapp_message_id?: string | null
          quoted_message_id?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      tickets: {
        Row: {
          id: string
          conversation_id: string
          title: string
          description: string | null
          priority: 'low' | 'medium' | 'high' | 'urgent'
          status: 'open' | 'in_progress' | 'resolved' | 'closed'
          assigned_to: string | null
          created_by: string | null
          resolved_at: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          title: string
          description?: string | null
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          status?: 'open' | 'in_progress' | 'resolved' | 'closed'
          assigned_to?: string | null
          created_by?: string | null
          resolved_at?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          title?: string
          description?: string | null
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          status?: 'open' | 'in_progress' | 'resolved' | 'closed'
          assigned_to?: string | null
          created_by?: string | null
          resolved_at?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      chatbots: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          trigger_keywords: string[] | null
          flow_data: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          trigger_keywords?: string[] | null
          flow_data?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          trigger_keywords?: string[] | null
          flow_data?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      broadcasts: {
        Row: {
          id: string
          user_id: string
          name: string
          message: string
          media_url: string | null
          scheduled_at: string | null
          status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
          total_recipients: number
          sent_count: number
          delivered_count: number
          read_count: number
          failed_count: number
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          message: string
          media_url?: string | null
          scheduled_at?: string | null
          status?: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
          total_recipients?: number
          sent_count?: number
          delivered_count?: number
          read_count?: number
          failed_count?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          message?: string
          media_url?: string | null
          scheduled_at?: string | null
          status?: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
          total_recipients?: number
          sent_count?: number
          delivered_count?: number
          read_count?: number
          failed_count?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      broadcast_recipients: {
        Row: {
          id: string
          broadcast_id: string
          contact_id: string
          status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
          sent_at: string | null
          delivered_at: string | null
          read_at: string | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          broadcast_id: string
          contact_id: string
          status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
          sent_at?: string | null
          delivered_at?: string | null
          read_at?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          broadcast_id?: string
          contact_id?: string
          status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
          sent_at?: string | null
          delivered_at?: string | null
          read_at?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      labels: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          created_at?: string
          updated_at?: string
        }
      }
      conversation_labels: {
        Row: {
          id: string
          conversation_id: string
          label_id: string
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          conversation_id: string
          label_id: string
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          conversation_id?: string
          label_id?: string
          created_at?: string
          created_by?: string | null
        }
      }
      conversation_notes: {
        Row: {
          id: string
          conversation_id: string
          content: string
          rating: number | null
          created_at: string
          created_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          content: string
          rating?: number | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          content?: string
          rating?: number | null
          created_at?: string
          created_by?: string | null
          updated_at?: string
        }
      }
      quick_replies: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string
          variables: Json
          category: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content: string
          variables?: Json
          category?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string
          variables?: Json
          category?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      chatbot_sessions: {
        Row: {
          id: string
          conversation_id: string
          chatbot_id: string
          is_active: boolean
          started_at: string
          stopped_at: string | null
          stopped_by: string | null
        }
        Insert: {
          id?: string
          conversation_id: string
          chatbot_id: string
          is_active?: boolean
          started_at?: string
          stopped_at?: string | null
          stopped_by?: string | null
        }
        Update: {
          id?: string
          conversation_id?: string
          chatbot_id?: string
          is_active?: boolean
          started_at?: string
          stopped_at?: string | null
          stopped_by?: string | null
        }
      }
      roles: {
        Row: {
          id: string
          role_name: string
          description: string | null
          is_master_template: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          role_name: string
          description?: string | null
          is_master_template?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role_name?: string
          description?: string | null
          is_master_template?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role_id: string
          assigned_at: string
          assigned_by: string | null
        }
        Insert: {
          id?: string
          user_id: string
          role_id: string
          assigned_at?: string
          assigned_by?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          role_id?: string
          assigned_at?: string
          assigned_by?: string | null
        }
      }
      permissions: {
        Row: {
          id: string
          permission_key: string
          permission_name: string
          module: string
          page: string | null
          action: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          permission_key: string
          permission_name: string
          module: string
          page?: string | null
          action: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          permission_key?: string
          permission_name?: string
          module?: string
          page?: string | null
          action?: string
          description?: string | null
          created_at?: string
        }
      }
      role_permissions: {
        Row: {
          id: string
          role_id: string
          permission_id: string
          created_at: string
        }
        Insert: {
          id?: string
          role_id: string
          permission_id: string
          created_at?: string
        }
        Update: {
          id?: string
          role_id?: string
          permission_id?: string
          created_at?: string
        }
      }
      handover_logs: {
        Row: {
          id: string
          conversation_id: string
          from_agent_id: string
          to_agent_id: string
          reason: string | null
          handover_at: string
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          from_agent_id: string
          to_agent_id: string
          reason?: string | null
          handover_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          from_agent_id?: string
          to_agent_id?: string
          reason?: string | null
          handover_at?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_permissions: {
        Args: {
          p_user_id: string
        }
        Returns: {
          permission_key: string
          permission_name: string
          module: string
          page: string | null
          action: string
        }[]
      }
      user_has_permission: {
        Args: {
          p_user_id: string
          p_permission_key: string
        }
        Returns: boolean
      }
      get_user_roles: {
        Args: {
          p_user_id: string
        }
        Returns: {
          role_id: string
          role_name: string
          description: string | null
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
