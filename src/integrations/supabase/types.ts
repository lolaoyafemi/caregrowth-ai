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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agencies: {
        Row: {
          admin_user_id: string
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          admin_user_id: string
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          admin_user_id?: string
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      credit_inventory: {
        Row: {
          available_balance: number | null
          id: string
          sold_to_agencies: number
          total_purchased: number
          updated_at: string
        }
        Insert: {
          available_balance?: number | null
          id?: string
          sold_to_agencies?: number
          total_purchased?: number
          updated_at?: string
        }
        Update: {
          available_balance?: number | null
          id?: string
          sold_to_agencies?: number
          total_purchased?: number
          updated_at?: string
        }
        Relationships: []
      }
      credit_pricing: {
        Row: {
          id: string
          last_updated: string
          price_per_credit: number
        }
        Insert: {
          id?: string
          last_updated?: string
          price_per_credit?: number
        }
        Update: {
          id?: string
          last_updated?: string
          price_per_credit?: number
        }
        Relationships: []
      }
      credit_purchases: {
        Row: {
          created_at: string
          credits_granted: number
          email: string
          expires_at: string
          id: string
          source_id: string | null
          source_type: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_granted?: number
          email: string
          expires_at: string
          id?: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_granted?: number
          email?: string
          expires_at?: string
          id?: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_sales_log: {
        Row: {
          amount_paid: number
          credits_purchased: number
          email: string
          id: string
          plan_name: string
          stripe_session_id: string | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          amount_paid: number
          credits_purchased: number
          email: string
          id?: string
          plan_name: string
          stripe_session_id?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          amount_paid?: number
          credits_purchased?: number
          email?: string
          id?: string
          plan_name?: string
          stripe_session_id?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      credit_usage_log: {
        Row: {
          credits_used: number
          description: string | null
          email: string | null
          id: string
          tool: string
          used_at: string
          user_id: string
        }
        Insert: {
          credits_used: number
          description?: string | null
          email?: string | null
          id?: string
          tool: string
          used_at?: string
          user_id: string
        }
        Update: {
          credits_used?: number
          description?: string | null
          email?: string | null
          id?: string
          tool?: string
          used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          chunk_index: number | null
          chunk_overlap_end: number | null
          chunk_overlap_start: number | null
          content: string | null
          created_at: string | null
          document_id: string | null
          embedding: string | null
          id: string
          is_shared: boolean | null
          page_number: number | null
          section_path: string | null
          token_count: number | null
          tsvector_content: unknown | null
        }
        Insert: {
          chunk_index?: number | null
          chunk_overlap_end?: number | null
          chunk_overlap_start?: number | null
          content?: string | null
          created_at?: string | null
          document_id?: string | null
          embedding?: string | null
          id?: string
          is_shared?: boolean | null
          page_number?: number | null
          section_path?: string | null
          token_count?: number | null
          tsvector_content?: unknown | null
        }
        Update: {
          chunk_index?: number | null
          chunk_overlap_end?: number | null
          chunk_overlap_start?: number | null
          content?: string | null
          created_at?: string | null
          document_id?: string | null
          embedding?: string | null
          id?: string
          is_shared?: boolean | null
          page_number?: number | null
          section_path?: string | null
          token_count?: number | null
          tsvector_content?: unknown | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string | null
          google_doc_id: string | null
          id: string
          normalized_text: string
          processing_status: string | null
          raw_text: string
          shared_doc_id: string | null
          title: string | null
          total_pages: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          google_doc_id?: string | null
          id?: string
          normalized_text: string
          processing_status?: string | null
          raw_text: string
          shared_doc_id?: string | null
          title?: string | null
          total_pages?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          google_doc_id?: string | null
          id?: string
          normalized_text?: string
          processing_status?: string | null
          raw_text?: string
          shared_doc_id?: string | null
          title?: string | null
          total_pages?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_google_doc_id_fkey"
            columns: ["google_doc_id"]
            isOneToOne: false
            referencedRelation: "google_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_shared_doc_id_fkey"
            columns: ["shared_doc_id"]
            isOneToOne: false
            referencedRelation: "shared_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expires_in: number | null
          id: string
          refresh_token: string | null
          scope: string | null
          token_type: string | null
          user_id: string | null
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_in?: number | null
          id?: string
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          user_id?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_in?: number | null
          id?: string
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      golden_tests: {
        Row: {
          created_at: string | null
          expected_doc_id: string | null
          expected_page_number: number | null
          expected_substring: string
          id: string
          last_success: boolean | null
          last_tested_at: string | null
          notes: string | null
          query_text: string
          test_category: string | null
        }
        Insert: {
          created_at?: string | null
          expected_doc_id?: string | null
          expected_page_number?: number | null
          expected_substring: string
          id?: string
          last_success?: boolean | null
          last_tested_at?: string | null
          notes?: string | null
          query_text: string
          test_category?: string | null
        }
        Update: {
          created_at?: string | null
          expected_doc_id?: string | null
          expected_page_number?: number | null
          expected_substring?: string
          id?: string
          last_success?: boolean | null
          last_tested_at?: string | null
          notes?: string | null
          query_text?: string
          test_category?: string | null
        }
        Relationships: []
      }
      google_connections: {
        Row: {
          access_token: string
          agency_id: string
          created_at: string | null
          expires_at: string
          google_email: string | null
          google_user_id: string
          id: string
          refresh_token: string
          scope: string | null
          selected_folder_id: string | null
          selected_folder_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          agency_id: string
          created_at?: string | null
          expires_at: string
          google_email?: string | null
          google_user_id: string
          id?: string
          refresh_token: string
          scope?: string | null
          selected_folder_id?: string | null
          selected_folder_name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          agency_id?: string
          created_at?: string | null
          expires_at?: string
          google_email?: string | null
          google_user_id?: string
          id?: string
          refresh_token?: string
          scope?: string | null
          selected_folder_id?: string | null
          selected_folder_name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_connections_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      google_documents: {
        Row: {
          created_at: string
          doc_link: string
          doc_title: string | null
          fetched: boolean
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doc_link: string
          doc_title?: string | null
          fetched?: boolean
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          doc_link?: string
          doc_title?: string | null
          fetched?: boolean
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      openai_keys: {
        Row: {
          active: boolean
          created_at: string
          id: string
          key_name: string
          secret_key: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          key_name: string
          secret_key: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          key_name?: string
          secret_key?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          credits_granted: number
          email: string
          id: string
          plan_name: string
          status: string
          stripe_session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          credits_granted: number
          email: string
          id?: string
          plan_name: string
          status?: string
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          credits_granted?: number
          email?: string
          id?: string
          plan_name?: string
          status?: string
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      post_history: {
        Row: {
          audience: string | null
          content: string | null
          created_at: string | null
          id: string
          platform: string | null
          prompt_category: string | null
          regenerated_from: string | null
          tone: string | null
          user_id: string | null
        }
        Insert: {
          audience?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          platform?: string | null
          prompt_category?: string | null
          regenerated_from?: string | null
          tone?: string | null
          user_id?: string | null
        }
        Update: {
          audience?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          platform?: string | null
          prompt_category?: string | null
          regenerated_from?: string | null
          tone?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      prompts: {
        Row: {
          body: string
          category: string
          created_at: string
          cta: string
          hook: string
          id: string
          name: string
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          category: string
          created_at?: string
          cta: string
          hook: string
          id?: string
          name: string
          platform: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          cta?: string
          hook?: string
          id?: string
          name?: string
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prompts_modified: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          platform: string
          prompt: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          name: string
          platform: string
          prompt: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          platform?: string
          prompt?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      qna_logs: {
        Row: {
          agency_id: string | null
          category: string | null
          created_at: string | null
          id: string
          question: string | null
          response: string | null
          sources: string[] | null
        }
        Insert: {
          agency_id?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          question?: string | null
          response?: string | null
          sources?: string[] | null
        }
        Update: {
          agency_id?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          question?: string | null
          response?: string | null
          sources?: string[] | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          count: number
          created_at: string
          id: string
          ip_address: unknown | null
          user_id: string | null
          window_start: string
        }
        Insert: {
          action: string
          count?: number
          created_at?: string
          id?: string
          ip_address?: unknown | null
          user_id?: string | null
          window_start?: string
        }
        Update: {
          action?: string
          count?: number
          created_at?: string
          id?: string
          ip_address?: unknown | null
          user_id?: string | null
          window_start?: string
        }
        Relationships: []
      }
      role_audit_log: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          new_role: string
          old_role: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_role: string
          old_role?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_role?: string
          old_role?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      saved_posts: {
        Row: {
          audience: string | null
          content: string
          created_at: string
          id: string
          platform: string
          prompt_category: string | null
          tone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audience?: string | null
          content: string
          created_at?: string
          id?: string
          platform: string
          prompt_category?: string | null
          tone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audience?: string | null
          content?: string
          created_at?: string
          id?: string
          platform?: string
          prompt_category?: string | null
          tone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      shared_documents: {
        Row: {
          created_at: string
          doc_title: string | null
          document_category: string | null
          fetched: boolean
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          processing_status: string | null
          training_priority: number | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          doc_title?: string | null
          document_category?: string | null
          fetched?: boolean
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          processing_status?: string | null
          training_priority?: number | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          doc_title?: string | null
          document_category?: string | null
          fetched?: boolean
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          processing_status?: string | null
          training_priority?: number | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      shared_folders: {
        Row: {
          created_at: string
          documents_count: number | null
          error_message: string | null
          folder_id: string
          folder_name: string
          folder_url: string
          id: string
          last_synced_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          documents_count?: number | null
          error_message?: string | null
          folder_id: string
          folder_name: string
          folder_url: string
          id?: string
          last_synced_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          documents_count?: number | null
          error_message?: string | null
          folder_id?: string
          folder_name?: string
          folder_url?: string
          id?: string
          last_synced_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          platform: string | null
          post_type: string | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          platform?: string | null
          post_type?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          platform?: string | null
          post_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          credits_per_cycle: number
          current_period_end: string | null
          current_period_start: string | null
          email: string
          id: string
          plan_name: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          credits_per_cycle?: number
          current_period_end?: string | null
          current_period_start?: string | null
          email: string
          id?: string
          plan_name: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          credits_per_cycle?: number
          current_period_end?: string | null
          current_period_start?: string | null
          email?: string
          id?: string
          plan_name?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      support_responses: {
        Row: {
          admin_email: string | null
          admin_id: string | null
          created_at: string | null
          id: string
          response_text: string
          ticket_id: string | null
        }
        Insert: {
          admin_email?: string | null
          admin_id?: string | null
          created_at?: string | null
          id?: string
          response_text: string
          ticket_id?: string | null
        }
        Update: {
          admin_email?: string | null
          admin_id?: string | null
          created_at?: string | null
          id?: string
          response_text?: string
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_responses_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string | null
          id: string
          priority: string
          question: string
          status: string
          subject: string
          updated_at: string | null
          user_email: string
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          priority?: string
          question: string
          status?: string
          subject: string
          updated_at?: string | null
          user_email: string
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          priority?: string
          question?: string
          status?: string
          subject?: string
          updated_at?: string | null
          user_email?: string
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          audience_problem: string | null
          big_promise: string | null
          business_name: string | null
          core_service: string | null
          created_at: string
          credits: number | null
          credits_expire_at: string | null
          differentiator: string | null
          email: string | null
          full_name: string | null
          id: string
          ideal_client: string | null
          last_sign_in_at: string | null
          location: string | null
          main_offer: string | null
          objections: string[] | null
          pain_points: string[] | null
          phone_number: string | null
          plan_name: string | null
          role: string | null
          services: string | null
          status: string | null
          subscription_id: string | null
          testimonial: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audience_problem?: string | null
          big_promise?: string | null
          business_name?: string | null
          core_service?: string | null
          created_at?: string
          credits?: number | null
          credits_expire_at?: string | null
          differentiator?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          ideal_client?: string | null
          last_sign_in_at?: string | null
          location?: string | null
          main_offer?: string | null
          objections?: string[] | null
          pain_points?: string[] | null
          phone_number?: string | null
          plan_name?: string | null
          role?: string | null
          services?: string | null
          status?: string | null
          subscription_id?: string | null
          testimonial?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audience_problem?: string | null
          big_promise?: string | null
          business_name?: string | null
          core_service?: string | null
          created_at?: string
          credits?: number | null
          credits_expire_at?: string | null
          differentiator?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          ideal_client?: string | null
          last_sign_in_at?: string | null
          location?: string | null
          main_offer?: string | null
          objections?: string[] | null
          pain_points?: string[] | null
          phone_number?: string | null
          plan_name?: string | null
          role?: string | null
          services?: string | null
          status?: string | null
          subscription_id?: string | null
          testimonial?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown | null
          last_activity: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: unknown | null
          last_activity?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          last_activity?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          credits: number
          email: string | null
          id: string
          name: string | null
          plan: string | null
          role: string | null
        }
        Insert: {
          created_at?: string | null
          credits?: number
          email?: string | null
          id: string
          name?: string | null
          plan?: string | null
          role?: string | null
        }
        Update: {
          created_at?: string | null
          credits?: number
          email?: string | null
          id?: string
          name?: string | null
          plan?: string | null
          role?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allocate_subscription_credits: {
        Args: { p_credits: number; p_subscription_id: string }
        Returns: boolean
      }
      anonymize_old_financial_data: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      assign_user_role: {
        Args: { p_new_role: string; p_reason?: string; p_user_id: string }
        Returns: undefined
      }
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      deduct_credits_and_log: {
        Args: {
          p_credits_used: number
          p_description?: string
          p_tool: string
          p_user_id: string
        }
        Returns: Json
      }
      deduct_credits_fifo: {
        Args: { p_credits_to_deduct: number; p_user_id: string }
        Returns: Json
      }
      encrypt_sensitive_data: {
        Args: { data: string }
        Returns: string
      }
      expire_old_credits: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_active_credits: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_active_openai_key: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_sales_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          revenue_this_month: number
          sales_this_month: number
          total_revenue: number
          total_sales: number
        }[]
      }
      get_user_drive_tokens: {
        Args: { user_id: string }
        Returns: {
          access_token: string
          created_at: string
          expires_in: number
          refresh_token: string
        }[]
      }
      is_current_user_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_admin_action: {
        Args: {
          p_action: string
          p_new_values?: Json
          p_old_values?: Json
          p_resource_id?: string
          p_resource_type: string
        }
        Returns: undefined
      }
      log_security_event: {
        Args: { event_data?: Json; event_type: string; target_user_id?: string }
        Returns: undefined
      }
      validate_payment_access: {
        Args: { p_payment_id: string }
        Returns: boolean
      }
    }
    Enums: {
      user_role:
        | "super_admin"
        | "agency_admin"
        | "admin"
        | "collaborator"
        | "content_writer"
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
      user_role: [
        "super_admin",
        "agency_admin",
        "admin",
        "collaborator",
        "content_writer",
      ],
    },
  },
} as const
