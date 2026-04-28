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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          contact_email: string | null
          created_at: string | null
          id: string
          industry: string | null
          name: string
          referent_email: string | null
          referent_first_name: string | null
          referent_last_name: string | null
          referent_phone: string | null
          referent_function: string | null
        }
        Insert: {
          contact_email?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          name: string
          referent_email?: string | null
          referent_first_name?: string | null
          referent_last_name?: string | null
          referent_phone?: string | null
          referent_function?: string | null
        }
        Update: {
          contact_email?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          name?: string
          referent_email?: string | null
          referent_first_name?: string | null
          referent_last_name?: string | null
          referent_phone?: string | null
          referent_function?: string | null
        }
        Relationships: []
      }
      referents: {
        Row: {
          id: string
          client_id: string
          first_name: string | null
          last_name: string | null
          phone: string | null
          email: string | null
          referent_function: string | null
          gender: string | null
          display_order: number | null
          is_default: boolean
          created_at: string | null
        }
        Insert: {
          id?: string
          client_id: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          email?: string | null
          referent_function?: string | null
          gender?: string | null
          display_order?: number | null
          is_default?: boolean
          created_at?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          email?: string | null
          referent_function?: string | null
          gender?: string | null
          display_order?: number | null
          is_default?: boolean
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referents_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
      documents: {
        Row: {
          employee_id: string | null
          id: string
          layout_key: string | null
          name: string | null
          type: string | null
          tp_export_id: string | null
          tp_instance_id: string | null
          uploaded_at: string | null
          url: string
        }
        Insert: {
          employee_id?: string | null
          id?: string
          layout_key?: string | null
          name?: string | null
          type?: string | null
          tp_export_id?: string | null
          tp_instance_id?: string | null
          uploaded_at?: string | null
          url: string
        }
        Update: {
          employee_id?: string | null
          id?: string
          layout_key?: string | null
          name?: string | null
          type?: string | null
          tp_export_id?: string | null
          tp_instance_id?: string | null
          uploaded_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tp_export_id_fkey"
            columns: ["tp_export_id"]
            isOneToOne: false
            referencedRelation: "tp_exports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tp_instance_id_fkey"
            columns: ["tp_instance_id"]
            isOneToOne: false
            referencedRelation: "tp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_documents: {
        Row: {
          id: string
          employee_id: string
          title: string
          template_key: string
          accent_color: string
          status: string
          payload_json: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          title?: string
          template_key?: string
          accent_color?: string
          status?: string
          payload_json?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          title?: string
          template_key?: string
          accent_color?: string
          status?: string
          payload_json?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_versions: {
        Row: {
          id: string
          cv_document_id: string
          payload_json: Json
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          cv_document_id: string
          payload_json: Json
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          cv_document_id?: string
          payload_json?: Json
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_versions_cv_document_id_fkey"
            columns: ["cv_document_id"]
            isOneToOne: false
            referencedRelation: "cv_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_details: {
        Row: {
          ad_report_date: string | null
          autofilled_fields: string[] | null
          computer_skills: string | null
          contract_hours: number | null
          created_at: string | null
          current_job: string | null
          date_of_birth: string | null
          drivers_license: boolean | null
          drivers_license_type: string[] | null
          dutch_reading: string | null
          dutch_speaking: string | null
          dutch_writing: string | null
          education_level: string | null
          education_name: string | null
          employee_id: string | null
          gender: string | null
          has_computer: boolean | null
          has_transport: boolean | null
          id: string
          other_employers: string | null
          phone: string | null
          transport_type: string[] | null
          work_experience: string | null
        }
        Insert: {
          ad_report_date?: string | null
          autofilled_fields?: string[] | null
          computer_skills?: string | null
          contract_hours?: number | null
          created_at?: string | null
          current_job?: string | null
          date_of_birth?: string | null
          drivers_license?: boolean | null
          drivers_license_type?: string[] | null
          dutch_reading?: string | null
          dutch_speaking?: string | null
          dutch_writing?: string | null
          education_level?: string | null
          education_name?: string | null
          employee_id?: string | null
          gender?: string | null
          has_computer?: boolean | null
          has_transport?: boolean | null
          id?: string
          other_employers?: string | null
          phone?: string | null
          transport_type?: string[] | null
          work_experience?: string | null
        }
        Update: {
          ad_report_date?: string | null
          autofilled_fields?: string[] | null
          computer_skills?: string | null
          contract_hours?: number | null
          created_at?: string | null
          current_job?: string | null
          date_of_birth?: string | null
          drivers_license?: boolean | null
          drivers_license_type?: string[] | null
          dutch_reading?: string | null
          dutch_speaking?: string | null
          dutch_writing?: string | null
          education_level?: string | null
          education_name?: string | null
          employee_id?: string | null
          gender?: string | null
          has_computer?: boolean | null
          has_transport?: boolean | null
          id?: string
          other_employers?: string | null
          phone?: string | null
          transport_type?: string[] | null
          work_experience?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_details_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_users: {
        Row: {
          assigned_at: string | null
          employee_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          employee_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          employee_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_users_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          client_id: string | null
          referent_id: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
        }
        Insert: {
          client_id?: string | null
          referent_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
        }
        Update: {
          client_id?: string | null
          referent_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      tp_docs: {
        Row: {
          content: string | null
          created_at: string | null
          created_by: string | null
          employee_id: string | null
          id: string
          title: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          employee_id?: string | null
          id?: string
          title?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          employee_id?: string | null
          id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tp_docs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tp_docs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      tp_exports: {
        Row: {
          created_at: string
          created_by: string | null
          filename: string | null
          id: string
          layout_key: string
          snapshot_json: Json
          storage_path: string | null
          tp_instance_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          filename?: string | null
          id?: string
          layout_key: string
          snapshot_json?: Json
          storage_path?: string | null
          tp_instance_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          filename?: string | null
          id?: string
          layout_key?: string
          snapshot_json?: Json
          storage_path?: string | null
          tp_instance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tp_exports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tp_exports_tp_instance_id_fkey"
            columns: ["tp_instance_id"]
            isOneToOne: false
            referencedRelation: "tp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      tp_instances: {
        Row: {
          created_at: string
          created_by: string | null
          data_json: Json
          employee_id: string
          id: string
          layout_key: string
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_json?: Json
          employee_id: string
          id?: string
          layout_key: string
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_json?: Json
          employee_id?: string
          id?: string
          layout_key?: string
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tp_instances_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tp_instances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tp_instances_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tp_meta: {
        Row: {
          ad_report_date: string | null
          advies_ad_passende_arbeid: string | null
          advisor_initials: string | null
          akkoordtekst: string | null
          bijlage_fases: Json
          client_name: string | null
          client_referent_email: string | null
          client_referent_name: string | null
          client_referent_phone: string | null
          client_referent_function: string | null
          client_referent_gender: string | null
          created_at: string | null
          employee_id: string | null
          first_sick_day: string | null
          fml_izp_lab_date: string | null
          has_ad_report: boolean | null
          id: string
          inleiding: string | null
          inleiding_sub: string | null
          intake_date: string | null
          occupational_doctor_name: string | null
          occupational_doctor_org: string | null
          persoonlijk_profiel: string | null
          pow_meter: string | null
          praktische_belemmeringen: string | null
          prognose_bedrijfsarts: string | null
          registration_date: string | null
          sociale_achtergrond: string | null
          tp_creation_date: string | null
          tp_end_date: string | null
          tp_lead_time: number | null
          tp_start_date: string | null
          tp3_activities: Json | null
          trajectdoel_activiteiten: string | null
          visie_loopbaanadviseur: string | null
          visie_plaatsbaarheid: string | null
          visie_werknemer: string | null
          wettelijke_kaders: string | null
          zoekprofiel: string | null
        }
        Insert: {
          ad_report_date?: string | null
          advies_ad_passende_arbeid?: string | null
          advisor_initials?: string | null
          akkoordtekst?: string | null
          bijlage_fases?: Json
          client_name?: string | null
          client_referent_email?: string | null
          client_referent_name?: string | null
          client_referent_phone?: string | null
          client_referent_function?: string | null
          client_referent_gender?: string | null
          created_at?: string | null
          employee_id?: string | null
          first_sick_day?: string | null
          fml_izp_lab_date?: string | null
          has_ad_report?: boolean | null
          id?: string
          inleiding?: string | null
          inleiding_sub?: string | null
          intake_date?: string | null
          occupational_doctor_name?: string | null
          occupational_doctor_org?: string | null
          persoonlijk_profiel?: string | null
          pow_meter?: string | null
          praktische_belemmeringen?: string | null
          prognose_bedrijfsarts?: string | null
          registration_date?: string | null
          sociale_achtergrond?: string | null
          tp_creation_date?: string | null
          tp_end_date?: string | null
          tp_lead_time?: number | null
          tp_start_date?: string | null
          tp3_activities?: Json | null
          trajectdoel_activiteiten?: string | null
          visie_loopbaanadviseur?: string | null
          visie_plaatsbaarheid?: string | null
          visie_werknemer?: string | null
          wettelijke_kaders?: string | null
          zoekprofiel?: string | null
        }
        Update: {
          ad_report_date?: string | null
          advies_ad_passende_arbeid?: string | null
          advisor_initials?: string | null
          akkoordtekst?: string | null
          bijlage_fases?: Json
          client_name?: string | null
          client_referent_email?: string | null
          client_referent_name?: string | null
          client_referent_phone?: string | null
          client_referent_function?: string | null
          client_referent_gender?: string | null
          created_at?: string | null
          employee_id?: string | null
          first_sick_day?: string | null
          fml_izp_lab_date?: string | null
          has_ad_report?: boolean | null
          id?: string
          inleiding?: string | null
          inleiding_sub?: string | null
          intake_date?: string | null
          occupational_doctor_name?: string | null
          occupational_doctor_org?: string | null
          persoonlijk_profiel?: string | null
          pow_meter?: string | null
          praktische_belemmeringen?: string | null
          prognose_bedrijfsarts?: string | null
          registration_date?: string | null
          sociale_achtergrond?: string | null
          tp_creation_date?: string | null
          tp_end_date?: string | null
          tp_lead_time?: number | null
          tp_start_date?: string | null
          tp3_activities?: Json | null
          trajectdoel_activiteiten?: string | null
          visie_loopbaanadviseur?: string | null
          visie_plaatsbaarheid?: string | null
          visie_werknemer?: string | null
          wettelijke_kaders?: string | null
          zoekprofiel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tp_meta_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      user_clients: {
        Row: {
          assigned_by: string | null
          client_id: string
          created_at: string | null
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          client_id: string
          created_at?: string | null
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          client_id?: string
          created_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_clients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: string
          signup_token: string | null
          signup_token_expires_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: string
          signup_token?: string | null
          signup_token_expires_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: string
          signup_token?: string | null
          signup_token_expires_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      kb_article_chunks: {
        Row: {
          article_id: string
          chunk_index: number
          content: string
          created_at: string
          embedding: string
          id: string
        }
        Insert: {
          article_id: string
          chunk_index: number
          content: string
          created_at?: string
          embedding: string
          id?: string
        }
        Update: {
          article_id?: string
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_article_chunks_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "kb_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_articles: {
        Row: {
          body: string
          category_id: string
          created_at: string
          excerpt: string | null
          id: string
          locale: string
          published: boolean
          published_at: string | null
          search_vector: unknown
          slug: string
          title: string
          translation_group_id: string
          updated_at: string
        }
        Insert: {
          body?: string
          category_id: string
          created_at?: string
          excerpt?: string | null
          id?: string
          locale: string
          published?: boolean
          published_at?: string | null
          search_vector?: unknown
          slug: string
          title: string
          translation_group_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          category_id?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          locale?: string
          published?: boolean
          published_at?: string | null
          search_vector?: unknown
          slug?: string
          title?: string
          translation_group_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "kb_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          parent_id: string | null
          slug: string
          sort_order: number
          title: string
          tool_key: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          title: string
          tool_key?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          title?: string
          tool_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "kb_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_categories: {
        Row: {
          id: string
          label_en: string
          label_nl: string
          slug: string
          sort_order: number
        }
        Insert: {
          id?: string
          label_en: string
          label_nl: string
          slug: string
          sort_order?: number
        }
        Update: {
          id?: string
          label_en?: string
          label_nl?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          is_internal: boolean
          ticket_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_reads: {
        Row: {
          last_read_at: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          last_read_at?: string
          ticket_id: string
          user_id: string
        }
        Update: {
          last_read_at?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_reads_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assignee_id: string | null
          category_id: string
          closed_reason: string | null
          created_at: string
          description: string
          escalation_chat_transcript: Json | null
          first_admin_touch_at: string | null
          id: string
          internal_notes: string | null
          priority: string
          requester_id: string
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          category_id: string
          closed_reason?: string | null
          created_at?: string
          description?: string
          escalation_chat_transcript?: Json | null
          first_admin_touch_at?: string | null
          id?: string
          internal_notes?: string | null
          priority?: string
          requester_id: string
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          category_id?: string
          closed_reason?: string | null
          created_at?: string
          description?: string
          escalation_chat_transcript?: Json | null
          first_admin_touch_at?: string | null
          id?: string
          internal_notes?: string | null
          priority?: string
          requester_id?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "support_ticket_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      help_unread_ticket_count_admin: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      help_unread_ticket_count_requester: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      help_unread_ticket_ids_admin: {
        Args: Record<PropertyKey, never>
        Returns: { ticket_id: string }[]
      }
      help_unread_ticket_ids_requester: {
        Args: Record<PropertyKey, never>
        Returns: { ticket_id: string }[]
      }
      match_kb_chunks: {
        Args: {
          filter_locale: string
          match_count: number
          query_embedding: string
        }
        Returns: {
          article_id: string
          chunk_content: string
          chunk_id: string
          similarity: number
        }[]
      }
      search_kb_articles: {
        Args: {
          filter_locale: string
          result_limit: number
          search_query: string
        }
        Returns: {
          article_id: string
          excerpt: string | null
          headline: string
          slug: string
          title: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
