/**
 * Gerado por `supabase gen types typescript` (Supabase MCP).
 * Regenerar ao alterar o schema: `pnpm db:types`.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      agent_config: {
        Row: {
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: Json;
        };
        Insert: {
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: Json;
        };
        Update: {
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: Json;
        };
        Relationships: [];
      };
      agent_prompts: {
        Row: {
          content: string;
          created_at: string;
          created_by: string | null;
          id: number;
          is_active: boolean;
          label: string | null;
        };
        Insert: {
          content: string;
          created_at?: string;
          created_by?: string | null;
          id?: number;
          is_active?: boolean;
          label?: string | null;
        };
        Update: {
          content?: string;
          created_at?: string;
          created_by?: string | null;
          id?: number;
          is_active?: boolean;
          label?: string | null;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          agent_paused: boolean;
          created_at: string;
          id: string;
          last_message_at: string | null;
          last_message_role: string | null;
          paused_at: string | null;
          paused_reason: string | null;
          phone_number: string;
          thread_id: string;
          unread_count: number;
          updated_at: string;
        };
        Insert: {
          agent_paused?: boolean;
          created_at?: string;
          id?: string;
          last_message_at?: string | null;
          last_message_role?: string | null;
          paused_at?: string | null;
          paused_reason?: string | null;
          phone_number: string;
          thread_id: string;
          unread_count?: number;
          updated_at?: string;
        };
        Update: {
          agent_paused?: boolean;
          created_at?: string;
          id?: string;
          last_message_at?: string | null;
          last_message_role?: string | null;
          paused_at?: string | null;
          paused_reason?: string | null;
          phone_number?: string;
          thread_id?: string;
          unread_count?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'conversations_phone_number_fkey';
            columns: ['phone_number'];
            isOneToOne: true;
            referencedRelation: 'customer_profiles';
            referencedColumns: ['phone_number'];
          },
        ];
      };
      customer_profiles: {
        Row: {
          brand_prefs: string[] | null;
          created_at: string;
          display_name: string | null;
          last_seen_at: string | null;
          notes: string | null;
          phone_number: string;
          size_pref: string | null;
          updated_at: string;
        };
        Insert: {
          brand_prefs?: string[] | null;
          created_at?: string;
          display_name?: string | null;
          last_seen_at?: string | null;
          notes?: string | null;
          phone_number: string;
          size_pref?: string | null;
          updated_at?: string;
        };
        Update: {
          brand_prefs?: string[] | null;
          created_at?: string;
          display_name?: string | null;
          last_seen_at?: string | null;
          notes?: string | null;
          phone_number?: string;
          size_pref?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          content: string | null;
          conversation_id: string;
          created_at: string;
          id: string;
          media_mimetype: string | null;
          media_type: string | null;
          media_url: string | null;
          metadata: Json | null;
          role: string;
        };
        Insert: {
          content?: string | null;
          conversation_id: string;
          created_at?: string;
          id?: string;
          media_mimetype?: string | null;
          media_type?: string | null;
          media_url?: string | null;
          metadata?: Json | null;
          role: string;
        };
        Update: {
          content?: string | null;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          media_mimetype?: string | null;
          media_type?: string | null;
          media_url?: string | null;
          metadata?: Json | null;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// ─── Helpers tipados curtos usados pelo app ─────────────────────────
export type Conversation = Database['public']['Tables']['conversations']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type CustomerProfile = Database['public']['Tables']['customer_profiles']['Row'];
export type AgentPrompt = Database['public']['Tables']['agent_prompts']['Row'];
export type AgentConfig = Database['public']['Tables']['agent_config']['Row'];
