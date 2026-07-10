export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      action_requests: {
        Row: {
          action_type: string
          created_at: string
          delivery_response: string | null
          id: string
          order_id: string | null
          organization_id: string
          params: Json
          reasoning: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          ticket_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          delivery_response?: string | null
          id?: string
          order_id?: string | null
          organization_id: string
          params?: Json
          reasoning?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          ticket_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          delivery_response?: string | null
          id?: string
          order_id?: string | null
          organization_id?: string
          params?: Json
          reasoning?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_requests_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_log: {
        Row: {
          action: string
          actor_type: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          member_id: string | null
          metadata: Json
          organization_id: string
        }
        Insert: {
          action: string
          actor_type?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          member_id?: string | null
          metadata?: Json
          organization_id: string
        }
        Update: {
          action?: string
          actor_type?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          member_id?: string | null
          metadata?: Json
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_experiments: {
        Row: {
          agent_a_id: string
          agent_b_id: string
          created_at: string
          enabled: boolean
          id: string
          name: string
          organization_id: string
          split_percent: number
        }
        Insert: {
          agent_a_id: string
          agent_b_id: string
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          organization_id: string
          split_percent?: number
        }
        Update: {
          agent_a_id?: string
          agent_b_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          organization_id?: string
          split_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_experiments_agent_a_id_fkey"
            columns: ["agent_a_id"]
            isOneToOne: false
            referencedRelation: "agent_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_experiments_agent_b_id_fkey"
            columns: ["agent_b_id"]
            isOneToOne: false
            referencedRelation: "agent_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_experiments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_configs: {
        Row: {
          allowed_actions: string[]
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          model: string
          name: string
          organization_id: string
          system_prompt: string
          temperature: number
        }
        Insert: {
          allowed_actions?: string[]
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          model?: string
          name: string
          organization_id: string
          system_prompt?: string
          temperature?: number
        }
        Update: {
          allowed_actions?: string[]
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          model?: string
          name?: string
          organization_id?: string
          system_prompt?: string
          temperature?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          created_at: string
          customer_id: string | null
          duration_minutes: number
          id: string
          notes: string | null
          organization_id: string
          scheduled_at: string
          status: string
          ticket_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          duration_minutes?: number
          id?: string
          notes?: string | null
          organization_id: string
          scheduled_at: string
          status?: string
          ticket_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          duration_minutes?: number
          id?: string
          notes?: string | null
          organization_id?: string
          scheduled_at?: string
          status?: string
          ticket_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          message_id: string | null
          mime_type: string | null
          organization_id: string
          size_bytes: number | null
          storage_path: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          message_id?: string | null
          mime_type?: string | null
          organization_id: string
          size_bytes?: number | null
          storage_path: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          message_id?: string | null
          mime_type?: string | null
          organization_id?: string
          size_bytes?: number | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          name: string
          organization_id: string
          steps: Json
          trigger: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          organization_id: string
          steps?: Json
          trigger?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          organization_id?: string
          steps?: Json
          trigger?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      business_rules: {
        Row: {
          action: string
          applies_to: string[]
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          match_intents: string[]
          match_keywords: string[]
          match_regex: string | null
          match_tags: string[]
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          action?: string
          applies_to?: string[]
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          match_intents?: string[]
          match_keywords?: string[]
          match_regex?: string | null
          match_tags?: string[]
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          action?: string
          applies_to?: string[]
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          match_intents?: string[]
          match_keywords?: string[]
          match_regex?: string | null
          match_tags?: string[]
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          ai_summary: string | null
          avatar_url: string | null
          company: string | null
          created_at: string
          email: string | null
          id: string
          lifetime_value: number | null
          name: string | null
          notes: string | null
          organization_id: string
          phone: string | null
          tags: string[]
        }
        Insert: {
          ai_summary?: string | null
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lifetime_value?: number | null
          name?: string | null
          notes?: string | null
          organization_id: string
          phone?: string | null
          tags?: string[]
        }
        Update: {
          ai_summary?: string | null
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lifetime_value?: number | null
          name?: string | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_versions: {
        Row: {
          change_note: string | null
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          id: string
          organization_id: string
          snapshot: Json
        }
        Insert: {
          change_note?: string | null
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          organization_id: string
          snapshot: Json
        }
        Update: {
          change_note?: string | null
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          organization_id?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "entity_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["member_role"]
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["member_role"]
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["member_role"]
        }
        Relationships: [
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          max_attempts: number
          organization_id: string
          payload: Json
          run_after: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          organization_id: string
          payload?: Json
          run_after?: string
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          organization_id?: string
          payload?: Json
          run_after?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          organization_id: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          organization_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_chunks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          created_at: string
          customer_visible: boolean
          id: string
          organization_id: string
          source_type: string
          source_url: string | null
          status: string
          storage_path: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_visible?: boolean
          id?: string
          organization_id: string
          source_type?: string
          source_url?: string | null
          status?: string
          storage_path?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_visible?: boolean
          id?: string
          organization_id?: string
          source_type?: string
          source_url?: string | null
          status?: string
          storage_path?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          company: string | null
          created_at: string
          customer_id: string | null
          email: string | null
          id: string
          name: string | null
          notes: string | null
          organization_id: string
          source: string
          stage: string
          ticket_id: string | null
          value: number | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          organization_id: string
          source?: string
          stage?: string
          ticket_id?: string | null
          value?: number | null
        }
        Update: {
          company?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          organization_id?: string
          source?: string
          stage?: string
          ticket_id?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      macros: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "macros_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "macros_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_internal: boolean
          member_id: string | null
          organization_id: string
          sender: Database["public"]["Enums"]["message_sender"]
          sentiment: Database["public"]["Enums"]["sentiment"] | null
          ticket_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_internal?: boolean
          member_id?: string | null
          organization_id: string
          sender: Database["public"]["Enums"]["message_sender"]
          sentiment?: Database["public"]["Enums"]["sentiment"] | null
          ticket_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          member_id?: string | null
          organization_id?: string
          sender?: Database["public"]["Enums"]["message_sender"]
          sentiment?: Database["public"]["Enums"]["sentiment"] | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_id: string
          description: string | null
          expected_delivery: string | null
          id: string
          order_number: string
          ordered_at: string
          organization_id: string
          proactive_alert_sent_at: string | null
          proactive_reason: string | null
          status: string
          total: number | null
          tracking_number: string | null
          tracking_url: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          description?: string | null
          expected_delivery?: string | null
          id?: string
          order_number: string
          ordered_at?: string
          organization_id: string
          proactive_alert_sent_at?: string | null
          proactive_reason?: string | null
          status?: string
          total?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          description?: string | null
          expected_delivery?: string | null
          id?: string
          order_number?: string
          ordered_at?: string
          organization_id?: string
          proactive_alert_sent_at?: string | null
          proactive_reason?: string | null
          status?: string
          total?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          bucket: string
          count: number
          window_start: string
        }
        Insert: {
          bucket: string
          count?: number
          window_start: string
        }
        Update: {
          bucket?: string
          count?: number
          window_start?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          organization_id: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          organization_id: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          organization_id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          organization_id: string
          status: string
          ticket_id: string | null
          to_phone: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          organization_id: string
          status?: string
          ticket_id?: string | null
          to_phone: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          organization_id?: string
          status?: string
          ticket_id?: string | null
          to_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          ai_resolved: boolean
          assignee_id: string | null
          channel: string
          created_at: string
          csat_comment: string | null
          csat_rated_at: string | null
          csat_rating: number | null
          csat_sent_at: string | null
          csat_token: string
          customer_id: string | null
          decision_confidence: number | null
          decision_path: string | null
          decision_reason: string | null
          email_ref: string
          experiment_id: string | null
          experiment_variant: string | null
          first_response_at: string | null
          id: string
          intent: string | null
          organization_id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolved_at: string | null
          sentiment: Database["public"]["Enums"]["sentiment"] | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          ai_resolved?: boolean
          assignee_id?: string | null
          channel?: string
          created_at?: string
          csat_comment?: string | null
          csat_rated_at?: string | null
          csat_rating?: number | null
          csat_sent_at?: string | null
          csat_token?: string
          customer_id?: string | null
          decision_confidence?: number | null
          decision_path?: string | null
          decision_reason?: string | null
          email_ref?: string
          experiment_id?: string | null
          experiment_variant?: string | null
          first_response_at?: string | null
          id?: string
          intent?: string | null
          organization_id: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          sentiment?: Database["public"]["Enums"]["sentiment"] | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          ai_resolved?: boolean
          assignee_id?: string | null
          channel?: string
          created_at?: string
          csat_comment?: string | null
          csat_rated_at?: string | null
          csat_rating?: number | null
          csat_sent_at?: string | null
          csat_token?: string
          customer_id?: string | null
          decision_confidence?: number | null
          decision_path?: string | null
          decision_reason?: string | null
          email_ref?: string
          experiment_id?: string | null
          experiment_variant?: string | null
          first_response_at?: string | null
          id?: string
          intent?: string | null
          organization_id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          sentiment?: Database["public"]["Enums"]["sentiment"] | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_counters: {
        Row: {
          count: number
          key: string
          organization_id: string
          period: string
          updated_at: string
        }
        Insert: {
          count?: number
          key: string
          organization_id: string
          period: string
          updated_at?: string
        }
        Update: {
          count?: number
          key?: string
          organization_id?: string
          period?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_jobs: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          max_attempts: number
          organization_id: string
          payload: Json
          run_after: string
          status: string
          type: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_workspace: {
        Args: { p_name: string; p_slug: string }
        Returns: string
      }
      increment_usage: {
        Args: { p_key: string; p_org: string }
        Returns: number
      }
      match_knowledge_chunks: {
        Args: {
          match_count?: number
          min_similarity?: number
          query_embedding: string
        }
        Returns: {
          chunk_id: string
          chunk_index: number
          content: string
          document_id: string
          document_title: string
          similarity: number
        }[]
      }
      match_knowledge_chunks_for_org: {
        Args: {
          match_count?: number
          min_similarity?: number
          p_org_id: string
          query_embedding: string
        }
        Returns: {
          chunk_id: string
          chunk_index: number
          content: string
          document_id: string
          document_title: string
          similarity: number
        }[]
      }
      match_knowledge_chunks_public: {
        Args: {
          match_count?: number
          min_similarity?: number
          p_org_id: string
          query_embedding: string
        }
        Returns: {
          chunk_id: string
          chunk_index: number
          content: string
          document_id: string
          document_title: string
          similarity: number
        }[]
      }
      list_customer_visible_documents: {
        Args: { p_org_id: string }
        Returns: { id: string; title: string; tags: string[] }[]
      }
      rate_limit_gc: { Args: never; Returns: undefined }
      rate_limit_hit: {
        Args: { p_bucket: string; p_window_seconds: number }
        Returns: number
      }
      redeem_invitation: { Args: never; Returns: string }
      user_has_role: {
        Args: {
          p_min: Database["public"]["Enums"]["member_role"]
          p_org: string
        }
        Returns: boolean
      }
      user_org_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      member_role: "owner" | "admin" | "agent" | "viewer"
      message_sender: "customer" | "agent" | "ai" | "system"
      sentiment: "positive" | "neutral" | "negative"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status: "open" | "waiting" | "resolved" | "closed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      member_role: ["owner", "admin", "agent", "viewer"],
      message_sender: ["customer", "agent", "ai", "system"],
      sentiment: ["positive", "neutral", "negative"],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["open", "waiting", "resolved", "closed"],
    },
  },
} as const

// Convenience aliases used throughout the app.
export type TicketStatus = Enums<"ticket_status">
export type TicketPriority = Enums<"ticket_priority">
export type Sentiment = Enums<"sentiment">
export type Ticket = Tables<"tickets">
export type Customer = Tables<"customers">
export type Message = Tables<"messages">
export type Member = Tables<"members">
export type BusinessRuleRow = Tables<"business_rules">
export type Appointment = Tables<"appointments">
export type Lead = Tables<"leads">
export type Order = Tables<"orders">
export type OrderStatus = Order["status"]
export type EntityVersion = Tables<"entity_versions">
export type VersionedEntityType = "business_rule" | "automation" | "agent_config"
export type AgentExperiment = Tables<"agent_experiments">
export type ExperimentVariant = "a" | "b"
export type ActionRequest = Tables<"action_requests">
export type ActionType = "refund" | "cancel_order" | "update_shipping_address"
export type ActionRequestStatus = "pending" | "approved" | "rejected" | "sent" | "failed"
export type Macro = Tables<"macros">

