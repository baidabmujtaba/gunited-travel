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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      agency_ledger: {
        Row: {
          agency_id: string
          created_at: string
          created_by: string | null
          credit: number
          currency_code: string
          debit: number
          description: string | null
          entry_type: string
          exchange_rate: number
          id: string
          invoice_id: string | null
          order_id: string | null
          payment_id: string | null
          payment_method: string | null
          reference: string | null
          reverses_entry_id: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string
          created_by?: string | null
          credit?: number
          currency_code?: string
          debit?: number
          description?: string | null
          entry_type: string
          exchange_rate?: number
          id?: string
          invoice_id?: string | null
          order_id?: string | null
          payment_id?: string | null
          payment_method?: string | null
          reference?: string | null
          reverses_entry_id?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string
          created_by?: string | null
          credit?: number
          currency_code?: string
          debit?: number
          description?: string | null
          entry_type?: string
          exchange_rate?: number
          id?: string
          invoice_id?: string | null
          order_id?: string | null
          payment_id?: string | null
          payment_method?: string | null
          reference?: string | null
          reverses_entry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_ledger_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "travel_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_ledger_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_ledger_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_ledger_reverses_entry_id_fkey"
            columns: ["reverses_entry_id"]
            isOneToOne: false
            referencedRelation: "agency_ledger"
            referencedColumns: ["id"]
          },
        ]
      }
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
          agency_id: string | null
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
          agency_id?: string | null
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
          agency_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "customers_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "travel_agencies"
            referencedColumns: ["id"]
          },
        ]
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
      flight_bookings: {
        Row: {
          amadeus_order_id: string
          created_at: string
          created_by: string | null
          currency_code: string
          customer_email: string | null
          departure_date: string | null
          destination: string | null
          environment: string
          id: string
          itinerary: Json
          origin: string | null
          raw_order: Json | null
          reference: string | null
          return_date: string | null
          status: string
          total_amount: number
          travelers: Json
          updated_at: string
        }
        Insert: {
          amadeus_order_id: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          customer_email?: string | null
          departure_date?: string | null
          destination?: string | null
          environment?: string
          id?: string
          itinerary?: Json
          origin?: string | null
          raw_order?: Json | null
          reference?: string | null
          return_date?: string | null
          status?: string
          total_amount?: number
          travelers?: Json
          updated_at?: string
        }
        Update: {
          amadeus_order_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          customer_email?: string | null
          departure_date?: string | null
          destination?: string | null
          environment?: string
          id?: string
          itinerary?: Json
          origin?: string | null
          raw_order?: Json | null
          reference?: string | null
          return_date?: string | null
          status?: string
          total_amount?: number
          travelers?: Json
          updated_at?: string
        }
        Relationships: []
      }
      integration_credentials: {
        Row: {
          client_id: string | null
          client_secret: string | null
          config: Json
          created_at: string
          environment: string
          key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          client_id?: string | null
          client_secret?: string | null
          config?: Json
          created_at?: string
          environment?: string
          key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          client_id?: string | null
          client_secret?: string | null
          config?: Json
          created_at?: string
          environment?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          agency_id: string | null
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
          agency_id?: string | null
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
          agency_id?: string | null
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
            foreignKeyName: "invoices_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "travel_agencies"
            referencedColumns: ["id"]
          },
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
          agency_id: string | null
          audience: string
          body_ar: string | null
          body_en: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          title_ar: string
          title_en: string
          user_id: string | null
        }
        Insert: {
          agency_id?: string | null
          audience?: string
          body_ar?: string | null
          body_en?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          title_ar: string
          title_en: string
          user_id?: string | null
        }
        Update: {
          agency_id?: string | null
          audience?: string
          body_ar?: string | null
          body_en?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          title_ar?: string
          title_en?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "travel_agencies"
            referencedColumns: ["id"]
          },
        ]
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
      payments: {
        Row: {
          agency_id: string | null
          amount: number
          amount_usd: number
          created_at: string
          currency_code: string
          customer_id: string | null
          description: string | null
          frozen_rate: number
          id: string
          notes: string | null
          order_id: string | null
          payer_name: string | null
          payment_date: string
          payment_method: string
          payment_number: string | null
          payment_type: string
          receipt_number: string | null
          receipt_path: string | null
          recorded_by: string | null
          reversed_by: string | null
          sending_institution: string | null
          status: string
          transaction_reference: string | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          amount: number
          amount_usd?: number
          created_at?: string
          currency_code?: string
          customer_id?: string | null
          description?: string | null
          frozen_rate?: number
          id?: string
          notes?: string | null
          order_id?: string | null
          payer_name?: string | null
          payment_date?: string
          payment_method?: string
          payment_number?: string | null
          payment_type?: string
          receipt_number?: string | null
          receipt_path?: string | null
          recorded_by?: string | null
          reversed_by?: string | null
          sending_institution?: string | null
          status?: string
          transaction_reference?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          amount?: number
          amount_usd?: number
          created_at?: string
          currency_code?: string
          customer_id?: string | null
          description?: string | null
          frozen_rate?: number
          id?: string
          notes?: string | null
          order_id?: string | null
          payer_name?: string | null
          payment_date?: string
          payment_method?: string
          payment_number?: string | null
          payment_type?: string
          receipt_number?: string | null
          receipt_path?: string | null
          recorded_by?: string | null
          reversed_by?: string | null
          sending_institution?: string | null
          status?: string
          transaction_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "travel_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          agency_id: string | null
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
          agency_id?: string | null
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
          agency_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "travel_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      service_offers: {
        Row: {
          agency_price_usd: number | null
          allowed_payment_methods: string[]
          base_price_usd: number
          category: string
          commission_percent: number
          created_at: string
          created_by: string | null
          customer_price_usd: number
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
          agency_price_usd?: number | null
          allowed_payment_methods?: string[]
          base_price_usd: number
          category?: string
          commission_percent?: number
          created_at?: string
          created_by?: string | null
          customer_price_usd?: number
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
          agency_price_usd?: number | null
          allowed_payment_methods?: string[]
          base_price_usd?: number
          category?: string
          commission_percent?: number
          created_at?: string
          created_by?: string | null
          customer_price_usd?: number
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
          agency_id: string | null
          amount_display: number
          amount_usd: number
          applied_price_usd: number | null
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
          price_context: string | null
          receipt_path: string | null
          status: Database["public"]["Enums"]["order_status"]
          tracking_id: string | null
          transaction_reference: string | null
          updated_at: string
          whatsapp: string
        }
        Insert: {
          agency_id?: string | null
          amount_display?: number
          amount_usd?: number
          applied_price_usd?: number | null
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
          price_context?: string | null
          receipt_path?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          tracking_id?: string | null
          transaction_reference?: string | null
          updated_at?: string
          whatsapp: string
        }
        Update: {
          agency_id?: string | null
          amount_display?: number
          amount_usd?: number
          applied_price_usd?: number | null
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
          price_context?: string | null
          receipt_path?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          tracking_id?: string | null
          transaction_reference?: string | null
          updated_at?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "travel_agencies"
            referencedColumns: ["id"]
          },
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
      service_prices: {
        Row: {
          audience: string
          created_at: string
          id: string
          offer_id: string
          price_usd: number
          updated_at: string
        }
        Insert: {
          audience: string
          created_at?: string
          id?: string
          offer_id: string
          price_usd?: number
          updated_at?: string
        }
        Update: {
          audience?: string
          created_at?: string
          id?: string
          offer_id?: string
          price_usd?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_prices_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "service_offers"
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
          credit_limit_usd: number
          currency_code: string
          deleted_at: string | null
          email: string | null
          financial_hold: boolean
          id: string
          is_active: boolean
          license_number: string | null
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string | null
          warning_percent: number
          whatsapp: string | null
        }
        Insert: {
          agency_name: string
          city?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit_usd?: number
          currency_code?: string
          deleted_at?: string | null
          email?: string | null
          financial_hold?: boolean
          id?: string
          is_active?: boolean
          license_number?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
          warning_percent?: number
          whatsapp?: string | null
        }
        Update: {
          agency_name?: string
          city?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit_usd?: number
          currency_code?: string
          deleted_at?: string | null
          email?: string | null
          financial_hold?: boolean
          id?: string
          is_active?: boolean
          license_number?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
          warning_percent?: number
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
      v_agency_balances: {
        Row: {
          agency_id: string | null
          currency_code: string | null
          last_movement_at: string | null
          outstanding: number | null
          total_due: number | null
          total_paid: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_ledger_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "travel_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      agency_balance: {
        Args: { _agency_id: string; _currency?: string }
        Returns: number
      }
      current_agency_id: { Args: never; Returns: string }
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
