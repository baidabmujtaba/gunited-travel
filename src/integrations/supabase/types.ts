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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      currencies: {
        Row: {
          code: string
          created_at: string
          decimals: number
          is_active: boolean
          name_ar: string
          name_en: string
          symbol: string
        }
        Insert: {
          code: string
          created_at?: string
          decimals?: number
          is_active?: boolean
          name_ar: string
          name_en: string
          symbol: string
        }
        Update: {
          code?: string
          created_at?: string
          decimals?: number
          is_active?: boolean
          name_ar?: string
          name_en?: string
          symbol?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          city: string | null
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          nationality: string | null
          notes: string | null
          phone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          nationality?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          nationality?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          created_at: string
          currency_code: string
          id: string
          rate_per_usd: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          currency_code: string
          id?: string
          rate_per_usd: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          currency_code?: string
          id?: string
          rate_per_usd?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: true
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          currency_code: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          deleted_at: string | null
          discount_usd: number
          email_error: string | null
          email_sent_at: string | null
          frozen_rate: number
          id: string
          invoice_number: string
          issued_by: string | null
          notes: string | null
          order_id: string | null
          paid_usd: number
          payment_method_id: string | null
          pdf_url: string | null
          status: string
          subtotal_usd: number
          tax_usd: number
          total_display: number
          total_usd: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency_code?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          deleted_at?: string | null
          discount_usd?: number
          email_error?: string | null
          email_sent_at?: string | null
          frozen_rate?: number
          id?: string
          invoice_number: string
          issued_by?: string | null
          notes?: string | null
          order_id?: string | null
          paid_usd?: number
          payment_method_id?: string | null
          pdf_url?: string | null
          status?: string
          subtotal_usd?: number
          tax_usd?: number
          total_display?: number
          total_usd?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          deleted_at?: string | null
          discount_usd?: number
          email_error?: string | null
          email_sent_at?: string | null
          frozen_rate?: number
          id?: string
          invoice_number?: string
          issued_by?: string | null
          notes?: string | null
          order_id?: string | null
          paid_usd?: number
          payment_method_id?: string | null
          pdf_url?: string | null
          status?: string
          subtotal_usd?: number
          tax_usd?: number
          total_display?: number
          total_usd?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_method_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          audience: string
          body_ar: string | null
          body_en: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title_ar: string
          title_en: string
          user_id: string | null
        }
        Insert: {
          audience?: string
          body_ar?: string | null
          body_en?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title_ar: string
          title_en: string
          user_id?: string | null
        }
        Update: {
          audience?: string
          body_ar?: string | null
          body_en?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title_ar?: string
          title_en?: string
          user_id?: string | null
        }
        Relationships: []
      }
      order_documents: {
        Row: {
          created_at: string
          doc_key: string
          file_name: string | null
          file_path: string
          id: string
          label_ar: string
          label_en: string
          order_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          doc_key?: string
          file_name?: string | null
          file_path: string
          id?: string
          label_ar?: string
          label_en?: string
          order_id: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          doc_key?: string
          file_name?: string | null
          file_path?: string
          id?: string
          label_ar?: string
          label_en?: string
          order_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["order_status"]
          note: string | null
          order_id: string
          previous_status: Database["public"]["Enums"]["order_status"] | null
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: string
          new_status: Database["public"]["Enums"]["order_status"]
          note?: string | null
          order_id: string
          previous_status?: Database["public"]["Enums"]["order_status"] | null
        }
        Update: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["order_status"]
          note?: string | null
          order_id?: string
          previous_status?: Database["public"]["Enums"]["order_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_method_configs: {
        Row: {
          account_holder: string | null
          account_number: string | null
          branch: string | null
          created_at: string
          iban: string | null
          id: string
          instructions_ar: string | null
          instructions_en: string | null
          is_active: boolean
          name_ar: string
          name_en: string
          qr_image_url: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          branch?: string | null
          created_at?: string
          iban?: string | null
          id?: string
          instructions_ar?: string | null
          instructions_en?: string | null
          is_active?: boolean
          name_ar: string
          name_en: string
          qr_image_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          branch?: string | null
          created_at?: string
          iban?: string | null
          id?: string
          instructions_ar?: string | null
          instructions_en?: string | null
          is_active?: boolean
          name_ar?: string
          name_en?: string
          qr_image_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          discount_tier: number
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          is_agency: boolean
          must_change_password: boolean
          nationality: string | null
          passport_expiry: string | null
          passport_number: string | null
          phone: string | null
          preferred_language: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          discount_tier?: number
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          is_agency?: boolean
          must_change_password?: boolean
          nationality?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string | null
          preferred_language?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          discount_tier?: number
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          is_agency?: boolean
          must_change_password?: boolean
          nationality?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string | null
          preferred_language?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      service_offers: {
        Row: {
          allowed_payment_methods: string[]
          base_price_usd: number
          category: string
          commission_percent: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description_ar: string | null
          description_en: string | null
          discount_percent: number
          duration_ar: string | null
          duration_en: string | null
          expiry_date: string | null
          features: Json
          fee_amount_usd: number
          id: string
          images: Json
          primary_image: string | null
          required_documents: Json
          slug: string | null
          status: Database["public"]["Enums"]["offer_status"]
          tax_percent: number
          title_ar: string
          title_en: string
          updated_at: string
        }
        Insert: {
          allowed_payment_methods?: string[]
          base_price_usd: number
          category?: string
          commission_percent?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          discount_percent?: number
          duration_ar?: string | null
          duration_en?: string | null
          expiry_date?: string | null
          features?: Json
          fee_amount_usd?: number
          id?: string
          images?: Json
          primary_image?: string | null
          required_documents?: Json
          slug?: string | null
          status?: Database["public"]["Enums"]["offer_status"]
          tax_percent?: number
          title_ar: string
          title_en: string
          updated_at?: string
        }
        Update: {
          allowed_payment_methods?: string[]
          base_price_usd?: number
          category?: string
          commission_percent?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          discount_percent?: number
          duration_ar?: string | null
          duration_en?: string | null
          expiry_date?: string | null
          features?: Json
          fee_amount_usd?: number
          id?: string
          images?: Json
          primary_image?: string | null
          required_documents?: Json
          slug?: string | null
          status?: Database["public"]["Enums"]["offer_status"]
          tax_percent?: number
          title_ar?: string
          title_en?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_orders: {
        Row: {
          amount_display: number
          amount_usd: number
          assigned_to: string | null
          created_at: string
          currency_code: string
          customer_email: string
          customer_id: string | null
          customer_name: string
          deleted_at: string | null
          document_status: string | null
          frozen_rate: number
          id: string
          internal_notes: string | null
          offer_id: string | null
          payment_method_id: string | null
          payment_notified_at: string | null
          receipt_path: string | null
          status: Database["public"]["Enums"]["order_status"]
          tracking_id: string | null
          transaction_reference: string | null
          updated_at: string
          whatsapp: string
        }
        Insert: {
          amount_display?: number
          amount_usd?: number
          assigned_to?: string | null
          created_at?: string
          currency_code?: string
          customer_email: string
          customer_id?: string | null
          customer_name: string
          deleted_at?: string | null
          document_status?: string | null
          frozen_rate?: number
          id?: string
          internal_notes?: string | null
          offer_id?: string | null
          payment_method_id?: string | null
          payment_notified_at?: string | null
          receipt_path?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          tracking_id?: string | null
          transaction_reference?: string | null
          updated_at?: string
          whatsapp: string
        }
        Update: {
          amount_display?: number
          amount_usd?: number
          assigned_to?: string | null
          created_at?: string
          currency_code?: string
          customer_email?: string
          customer_id?: string | null
          customer_name?: string
          deleted_at?: string | null
          document_status?: string | null
          frozen_rate?: number
          id?: string
          internal_notes?: string | null
          offer_id?: string | null
          payment_method_id?: string | null
          payment_notified_at?: string | null
          receipt_path?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          tracking_id?: string | null
          transaction_reference?: string | null
          updated_at?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "service_orders_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "service_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_method_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      travel_agencies: {
        Row: {
          agency_name: string
          city: string | null
          contact_name: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          license_number: string | null
          notes: string | null
          phone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          agency_name: string
          city?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          license_number?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          agency_name?: string
          city?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          license_number?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      next_invoice_number: { Args: never; Returns: string }
      next_tracking_id: { Args: never; Returns: string }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "booking_agent"
        | "accountant"
        | "client"
        | "travel_agency"
      offer_status: "active" | "draft" | "archived"
      order_status:
        | "submitted"
        | "payment_pending"
        | "payment_confirmed"
        | "processing"
        | "completed"
        | "cancelled"
        | "rejected"
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
      app_role: [
        "super_admin",
        "admin",
        "booking_agent",
        "accountant",
        "client",
        "travel_agency",
      ],
      offer_status: ["active", "draft", "archived"],
      order_status: [
        "submitted",
        "payment_pending",
        "payment_confirmed",
        "processing",
        "completed",
        "cancelled",
        "rejected",
      ],
    },
  },
} as const
