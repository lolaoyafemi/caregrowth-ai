export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
      user_profiles: {
        Row: {
          audience_problem: string | null
          big_promise: string | null
          business_name: string | null
          core_service: string | null
          created_at: string
          credits: number | null
          differentiator: string | null
          email: string | null
          id: string
          ideal_client: string | null
          location: string | null
          main_offer: string | null
          objections: string[] | null
          pain_points: string[] | null
          plan_name: string | null
          services: string | null
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
          differentiator?: string | null
          email?: string | null
          id?: string
          ideal_client?: string | null
          location?: string | null
          main_offer?: string | null
          objections?: string[] | null
          pain_points?: string[] | null
          plan_name?: string | null
          services?: string | null
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
          differentiator?: string | null
          email?: string | null
          id?: string
          ideal_client?: string | null
          location?: string | null
          main_offer?: string | null
          objections?: string[] | null
          pain_points?: string[] | null
          plan_name?: string | null
          services?: string | null
          testimonial?: string | null
          updated_at?: string
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
      deduct_credits_and_log: {
        Args: {
          p_user_id: string
          p_tool: string
          p_credits_used: number
          p_description?: string
        }
        Returns: Json
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
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
