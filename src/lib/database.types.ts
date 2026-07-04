export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string;
          actor_type: string;
          created_at: string;
          entity_id: string | null;
          entity_type: string | null;
          id: string;
          member_id: string | null;
          metadata: Json;
          organization_id: string;
        };
        Insert: {
          action: string;
          actor_type?: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          member_id?: string | null;
          metadata?: Json;
          organization_id: string;
        };
        Update: {
          action?: string;
          actor_type?: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          member_id?: string | null;
          metadata?: Json;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_log_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_log_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      agent_configs: {
        Row: {
          allowed_actions: string[];
          created_at: string;
          description: string | null;
          enabled: boolean;
          id: string;
          model: string;
          name: string;
          organization_id: string;
          system_prompt: string;
          temperature: number;
        };
        Insert: {
          allowed_actions?: string[];
          created_at?: string;
          description?: string | null;
          enabled?: boolean;
          id?: string;
          model?: string;
          name: string;
          organization_id: string;
          system_prompt?: string;
          temperature?: number;
        };
        Update: {
          allowed_actions?: string[];
          created_at?: string;
          description?: string | null;
          enabled?: boolean;
          id?: string;
          model?: string;
          name?: string;
          organization_id?: string;
          system_prompt?: string;
          temperature?: number;
        };
        Relationships: [
          {
            foreignKeyName: "agent_configs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      attachments: {
        Row: {
          created_at: string;
          file_name: string;
          id: string;
          message_id: string | null;
          mime_type: string | null;
          organization_id: string;
          size_bytes: number | null;
          storage_path: string;
        };
        Insert: {
          created_at?: string;
          file_name: string;
          id?: string;
          message_id?: string | null;
          mime_type?: string | null;
          organization_id: string;
          size_bytes?: number | null;
          storage_path: string;
        };
        Update: {
          created_at?: string;
          file_name?: string;
          id?: string;
          message_id?: string | null;
          mime_type?: string | null;
          organization_id?: string;
          size_bytes?: number | null;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attachments_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attachments_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      automations: {
        Row: {
          created_at: string;
          enabled: boolean;
          id: string;
          name: string;
          organization_id: string;
          steps: Json;
          trigger: Json;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          enabled?: boolean;
          id?: string;
          name: string;
          organization_id: string;
          steps?: Json;
          trigger?: Json;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          enabled?: boolean;
          id?: string;
          name?: string;
          organization_id?: string;
          steps?: Json;
          trigger?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "automations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          ai_summary: string | null;
          avatar_url: string | null;
          company: string | null;
          created_at: string;
          email: string | null;
          id: string;
          lifetime_value: number | null;
          name: string | null;
          notes: string | null;
          organization_id: string;
          phone: string | null;
          tags: string[];
        };
        Insert: {
          ai_summary?: string | null;
          avatar_url?: string | null;
          company?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          lifetime_value?: number | null;
          name?: string | null;
          notes?: string | null;
          organization_id: string;
          phone?: string | null;
          tags?: string[];
        };
        Update: {
          ai_summary?: string | null;
          avatar_url?: string | null;
          company?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          lifetime_value?: number | null;
          name?: string | null;
          notes?: string | null;
          organization_id?: string;
          phone?: string | null;
          tags?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      invitations: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          email: string;
          id: string;
          invited_by: string | null;
          organization_id: string;
          role: Database["public"]["Enums"]["member_role"];
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          id?: string;
          invited_by?: string | null;
          organization_id: string;
          role?: Database["public"]["Enums"]["member_role"];
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          invited_by?: string | null;
          organization_id?: string;
          role?: Database["public"]["Enums"]["member_role"];
        };
        Relationships: [
          {
            foreignKeyName: "invitations_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      knowledge_chunks: {
        Row: {
          chunk_index: number;
          content: string;
          created_at: string;
          document_id: string;
          embedding: string | null;
          id: string;
          organization_id: string;
        };
        Insert: {
          chunk_index: number;
          content: string;
          created_at?: string;
          document_id: string;
          embedding?: string | null;
          id?: string;
          organization_id: string;
        };
        Update: {
          chunk_index?: number;
          content?: string;
          created_at?: string;
          document_id?: string;
          embedding?: string | null;
          id?: string;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "knowledge_documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "knowledge_chunks_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      knowledge_documents: {
        Row: {
          created_at: string;
          id: string;
          organization_id: string;
          source_type: string;
          source_url: string | null;
          status: string;
          storage_path: string | null;
          tags: string[];
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          organization_id: string;
          source_type?: string;
          source_url?: string | null;
          status?: string;
          storage_path?: string | null;
          tags?: string[];
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          organization_id?: string;
          source_type?: string;
          source_url?: string | null;
          status?: string;
          storage_path?: string | null;
          tags?: string[];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "knowledge_documents_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      members: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          organization_id: string;
          role: Database["public"]["Enums"]["member_role"];
          user_id: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          organization_id: string;
          role?: Database["public"]["Enums"]["member_role"];
          user_id: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          organization_id?: string;
          role?: Database["public"]["Enums"]["member_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          is_internal: boolean;
          member_id: string | null;
          organization_id: string;
          sender: Database["public"]["Enums"]["message_sender"];
          sentiment: Database["public"]["Enums"]["sentiment"] | null;
          ticket_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          is_internal?: boolean;
          member_id?: string | null;
          organization_id: string;
          sender: Database["public"]["Enums"]["message_sender"];
          sentiment?: Database["public"]["Enums"]["sentiment"] | null;
          ticket_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          is_internal?: boolean;
          member_id?: string | null;
          organization_id?: string;
          sender?: Database["public"]["Enums"]["message_sender"];
          sentiment?: Database["public"]["Enums"]["sentiment"] | null;
          ticket_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          id: string;
          logo_url: string | null;
          name: string;
          slug: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          key: string;
          organization_id: string;
          updated_at: string;
          value: Json;
        };
        Insert: {
          key: string;
          organization_id: string;
          updated_at?: string;
          value?: Json;
        };
        Update: {
          key?: string;
          organization_id?: string;
          updated_at?: string;
          value?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "settings_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      tickets: {
        Row: {
          ai_resolved: boolean;
          assignee_id: string | null;
          channel: string;
          created_at: string;
          customer_id: string | null;
          first_response_at: string | null;
          id: string;
          intent: string | null;
          organization_id: string;
          priority: Database["public"]["Enums"]["ticket_priority"];
          resolved_at: string | null;
          sentiment: Database["public"]["Enums"]["sentiment"] | null;
          status: Database["public"]["Enums"]["ticket_status"];
          subject: string;
          tags: string[];
          updated_at: string;
        };
        Insert: {
          ai_resolved?: boolean;
          assignee_id?: string | null;
          channel?: string;
          created_at?: string;
          customer_id?: string | null;
          first_response_at?: string | null;
          id?: string;
          intent?: string | null;
          organization_id: string;
          priority?: Database["public"]["Enums"]["ticket_priority"];
          resolved_at?: string | null;
          sentiment?: Database["public"]["Enums"]["sentiment"] | null;
          status?: Database["public"]["Enums"]["ticket_status"];
          subject: string;
          tags?: string[];
          updated_at?: string;
        };
        Update: {
          ai_resolved?: boolean;
          assignee_id?: string | null;
          channel?: string;
          created_at?: string;
          customer_id?: string | null;
          first_response_at?: string | null;
          id?: string;
          intent?: string | null;
          organization_id?: string;
          priority?: Database["public"]["Enums"]["ticket_priority"];
          resolved_at?: string | null;
          sentiment?: Database["public"]["Enums"]["sentiment"] | null;
          status?: Database["public"]["Enums"]["ticket_status"];
          subject?: string;
          tags?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tickets_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      usage_counters: {
        Row: {
          count: number;
          key: string;
          organization_id: string;
          period: string;
          updated_at: string;
        };
        Insert: {
          count?: number;
          key: string;
          organization_id: string;
          period: string;
          updated_at?: string;
        };
        Update: {
          count?: number;
          key?: string;
          organization_id?: string;
          period?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "usage_counters_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      user_org_ids: { Args: never; Returns: string[] };
      increment_usage: {
        Args: { p_org: string; p_key: string };
        Returns: number;
      };
      redeem_invitation: { Args: never; Returns: string | null };
      match_knowledge_chunks: {
        Args: {
          query_embedding: string;
          match_count?: number;
          min_similarity?: number;
        };
        Returns: {
          chunk_id: string;
          document_id: string;
          document_title: string;
          content: string;
          chunk_index: number;
          similarity: number;
        }[];
      };
    };
    Enums: {
      member_role: "owner" | "admin" | "agent" | "viewer";
      message_sender: "customer" | "agent" | "ai" | "system";
      sentiment: "positive" | "neutral" | "negative";
      ticket_priority: "low" | "medium" | "high" | "urgent";
      ticket_status: "open" | "waiting" | "resolved" | "closed";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];

export type TicketStatus = Enums<"ticket_status">;
export type TicketPriority = Enums<"ticket_priority">;
export type Sentiment = Enums<"sentiment">;
export type Ticket = Tables<"tickets">;
export type Customer = Tables<"customers">;
export type Message = Tables<"messages">;
export type Member = Tables<"members">;
