
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activity": {
                  Row: {
                    "actor_id": string | null,"body": string | null,"budget_id": string | null,"changes": Json | null,"claim_id": string | null,"community_id": string | null,"corrects_id": string | null,"counterpart": string | null,"created_at": string,"document_id": string | null,"id": string,"incident_id": string | null,"invoice_id": string | null,"kind": string,"occurred_at": string,"provider_id": string | null,"summary": string,"task_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"body"?: string | null,"budget_id"?: string | null,"changes"?: Json | null,"claim_id"?: string | null,"community_id"?: string | null,"corrects_id"?: string | null,"counterpart"?: string | null,"created_at"?: string,"document_id"?: string | null,"id"?: string,"incident_id"?: string | null,"invoice_id"?: string | null,"kind": string,"occurred_at"?: string,"provider_id"?: string | null,"summary": string,"task_id"?: string | null
                  }
                  Update: {
                    "actor_id"?: string | null,"body"?: string | null,"budget_id"?: string | null,"changes"?: Json | null,"claim_id"?: string | null,"community_id"?: string | null,"corrects_id"?: string | null,"counterpart"?: string | null,"created_at"?: string,"document_id"?: string | null,"id"?: string,"incident_id"?: string | null,"invoice_id"?: string | null,"kind"?: string,"occurred_at"?: string,"provider_id"?: string | null,"summary"?: string,"task_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_budget_id_fkey"
      columns: ["budget_id"]
isOneToOne: false
      referencedRelation: "budgets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_budget_id_fkey"
      columns: ["budget_id"]
isOneToOne: false
      referencedRelation: "budgets_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_claim_id_fkey"
      columns: ["claim_id"]
isOneToOne: false
      referencedRelation: "claims"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_claim_id_fkey"
      columns: ["claim_id"]
isOneToOne: false
      referencedRelation: "claims_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_corrects_id_fkey"
      columns: ["corrects_id"]
isOneToOne: false
      referencedRelation: "activity"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_corrects_id_fkey"
      columns: ["corrects_id"]
isOneToOne: false
      referencedRelation: "activity_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_document_id_fkey"
      columns: ["document_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_incident_id_fkey"
      columns: ["incident_id"]
isOneToOne: false
      referencedRelation: "incidents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_incident_id_fkey"
      columns: ["incident_id"]
isOneToOne: false
      referencedRelation: "incidents_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_invoice_id_fkey"
      columns: ["invoice_id"]
isOneToOne: false
      referencedRelation: "invoices"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_invoice_id_fkey"
      columns: ["invoice_id"]
isOneToOne: false
      referencedRelation: "invoices_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"app_settings": {
                  Row: {
                    "app_name": string,"company_name": string,"currency": string,"date_format": string,"default_vat_rate": number,"due_soon_days": number,"id": boolean,"inactivity_days": number,"locale": string,"logo_path": string | null,"primary_color": string | null,"timezone": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "app_name"?: string,"company_name"?: string,"currency"?: string,"date_format"?: string,"default_vat_rate"?: number,"due_soon_days"?: number,"id"?: boolean,"inactivity_days"?: number,"locale"?: string,"logo_path"?: string | null,"primary_color"?: string | null,"timezone"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "app_name"?: string,"company_name"?: string,"currency"?: string,"date_format"?: string,"default_vat_rate"?: number,"due_soon_days"?: number,"id"?: boolean,"inactivity_days"?: number,"locale"?: string,"logo_path"?: string | null,"primary_color"?: string | null,"timezone"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"approval_limit_history": {
                  Row: {
                    "changed_at": string,"changed_by": string | null,"id": number,"new_limit": number | null,"old_limit": number | null,"staff_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_at"?: string,"changed_by"?: string | null,"id"?: never,"new_limit"?: number | null,"old_limit"?: number | null,"staff_id": string
                  }
                  Update: {
                    "changed_at"?: string,"changed_by"?: string | null,"id"?: never,"new_limit"?: number | null,"old_limit"?: number | null,"staff_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "approval_limit_history_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "approval_limit_history_staff_id_fkey"
      columns: ["staff_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_staff_id": string | null,"actor_user_id": string | null,"at": string,"changed_fields": (string)[] | null,"id": number,"new_data": Json | null,"old_data": Json | null,"row_id": string | null,"table_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_staff_id"?: string | null,"actor_user_id"?: string | null,"at"?: string,"changed_fields"?: (string)[] | null,"id"?: never,"new_data"?: Json | null,"old_data"?: Json | null,"row_id"?: string | null,"table_name": string
                  }
                  Update: {
                    "action"?: string,"actor_staff_id"?: string | null,"actor_user_id"?: string | null,"at"?: string,"changed_fields"?: (string)[] | null,"id"?: never,"new_data"?: Json | null,"old_data"?: Json | null,"row_id"?: string | null,"table_name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"budget_authorizations": {
                  Row: {
                    "amount": number,"authorized_by_name": string | null,"authorized_on": string,"budget_id": string,"created_at": string,"document_id": string | null,"id": string,"kind": Database["public"]['Enums']["authorization_kind"],"medium": string | null,"notes": string | null,"registered_by": string | null,"staff_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"authorized_by_name"?: string | null,"authorized_on"?: string,"budget_id": string,"created_at"?: string,"document_id"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["authorization_kind"],"medium"?: string | null,"notes"?: string | null,"registered_by"?: string | null,"staff_id"?: string | null
                  }
                  Update: {
                    "amount"?: number,"authorized_by_name"?: string | null,"authorized_on"?: string,"budget_id"?: string,"created_at"?: string,"document_id"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["authorization_kind"],"medium"?: string | null,"notes"?: string | null,"registered_by"?: string | null,"staff_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "budget_authorizations_budget_id_fkey"
      columns: ["budget_id"]
isOneToOne: false
      referencedRelation: "budgets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "budget_authorizations_budget_id_fkey"
      columns: ["budget_id"]
isOneToOne: false
      referencedRelation: "budgets_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "budget_authorizations_document_fk"
      columns: ["document_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "budget_authorizations_registered_by_fkey"
      columns: ["registered_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "budget_authorizations_staff_id_fkey"
      columns: ["staff_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"budgets": {
                  Row: {
                    "approval_kind": Database["public"]['Enums']["authorization_kind"] | null,"approved_at": string | null,"approved_by": string | null,"base_amount": number | null,"code": string,"community_id": string,"concept": string,"conditions": string | null,"created_at": string,"created_by": string | null,"description": string | null,"execution_term": string | null,"id": string,"incident_id": string | null,"provider_id": string | null,"received_on": string | null,"rejected_reason": string | null,"requested_on": string | null,"requires_superior": boolean,"selected": boolean,"status": Database["public"]['Enums']["budget_status"],"total_amount": number | null,"updated_at": string,"valid_until": string | null,"vat_amount": number | null,"vat_rate": number
                  }
                  ComputedFields: never
                  Insert: {
                    "approval_kind"?: Database["public"]['Enums']["authorization_kind"] | null,"approved_at"?: string | null,"approved_by"?: string | null,"base_amount"?: number | null,"code"?: string,"community_id": string,"concept": string,"conditions"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"execution_term"?: string | null,"id"?: string,"incident_id"?: string | null,"provider_id"?: string | null,"received_on"?: string | null,"rejected_reason"?: string | null,"requested_on"?: string | null,"requires_superior"?: boolean,"selected"?: boolean,"status"?: Database["public"]['Enums']["budget_status"],"total_amount"?: never,"updated_at"?: string,"valid_until"?: string | null,"vat_amount"?: never,"vat_rate"?: number
                  }
                  Update: {
                    "approval_kind"?: Database["public"]['Enums']["authorization_kind"] | null,"approved_at"?: string | null,"approved_by"?: string | null,"base_amount"?: number | null,"code"?: string,"community_id"?: string,"concept"?: string,"conditions"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"execution_term"?: string | null,"id"?: string,"incident_id"?: string | null,"provider_id"?: string | null,"received_on"?: string | null,"rejected_reason"?: string | null,"requested_on"?: string | null,"requires_superior"?: boolean,"selected"?: boolean,"status"?: Database["public"]['Enums']["budget_status"],"total_amount"?: never,"updated_at"?: string,"valid_until"?: string | null,"vat_amount"?: never,"vat_rate"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "budgets_approved_by_fkey"
      columns: ["approved_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "budgets_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "budgets_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "budgets_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "budgets_incident_id_fkey"
      columns: ["incident_id"]
isOneToOne: false
      referencedRelation: "incidents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "budgets_incident_id_fkey"
      columns: ["incident_id"]
isOneToOne: false
      referencedRelation: "incidents_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "budgets_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers"
      referencedColumns: ["id"]
    }
                  ]
                },"calendar_events": {
                  Row: {
                    "all_day": boolean,"cancelled": boolean,"claim_id": string | null,"community_id": string | null,"created_at": string,"created_by": string | null,"ends_at": string | null,"id": string,"incident_id": string | null,"kind": Database["public"]['Enums']["calendar_kind"],"notes": string | null,"staff_id": string | null,"starts_at": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "all_day"?: boolean,"cancelled"?: boolean,"claim_id"?: string | null,"community_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"ends_at"?: string | null,"id"?: string,"incident_id"?: string | null,"kind"?: Database["public"]['Enums']["calendar_kind"],"notes"?: string | null,"staff_id"?: string | null,"starts_at": string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "all_day"?: boolean,"cancelled"?: boolean,"claim_id"?: string | null,"community_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"ends_at"?: string | null,"id"?: string,"incident_id"?: string | null,"kind"?: Database["public"]['Enums']["calendar_kind"],"notes"?: string | null,"staff_id"?: string | null,"starts_at"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "calendar_events_claim_id_fkey"
      columns: ["claim_id"]
isOneToOne: false
      referencedRelation: "claims"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "calendar_events_claim_id_fkey"
      columns: ["claim_id"]
isOneToOne: false
      referencedRelation: "claims_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "calendar_events_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "calendar_events_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "calendar_events_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "calendar_events_incident_id_fkey"
      columns: ["incident_id"]
isOneToOne: false
      referencedRelation: "incidents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "calendar_events_incident_id_fkey"
      columns: ["incident_id"]
isOneToOne: false
      referencedRelation: "incidents_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "calendar_events_staff_id_fkey"
      columns: ["staff_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"categories": {
                  Row: {
                    "active": boolean,"created_at": string,"id": string,"name": string,"parent_id": string | null,"scope": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"id"?: string,"name": string,"parent_id"?: string | null,"scope": string,"sort_order"?: number
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"id"?: string,"name"?: string,"parent_id"?: string | null,"scope"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "categories_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"checklist_template_items": {
                  Row: {
                    "due_offset_days": number | null,"id": string,"sort_order": number,"template_id": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "due_offset_days"?: number | null,"id"?: string,"sort_order"?: number,"template_id": string,"title": string
                  }
                  Update: {
                    "due_offset_days"?: number | null,"id"?: string,"sort_order"?: number,"template_id"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "checklist_template_items_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "checklist_templates"
      referencedColumns: ["id"]
    }
                  ]
                },"checklist_templates": {
                  Row: {
                    "active": boolean,"created_at": string,"id": string,"kind": Database["public"]['Enums']["checklist_kind"],"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"id"?: string,"kind": Database["public"]['Enums']["checklist_kind"],"name": string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["checklist_kind"],"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"claims": {
                  Row: {
                    "adjuster_name": string | null,"adjuster_phone": string | null,"claim_number": string | null,"code": string,"communicated_on": string | null,"community_id": string,"created_at": string,"created_by": string | null,"description": string | null,"id": string,"incident_id": string | null,"insurer": string | null,"manager_id": string | null,"notes": string | null,"occurred_on": string | null,"policy_number": string | null,"status": Database["public"]['Enums']["claim_status"],"updated_at": string,"visit_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "adjuster_name"?: string | null,"adjuster_phone"?: string | null,"claim_number"?: string | null,"code"?: string,"communicated_on"?: string | null,"community_id": string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"incident_id"?: string | null,"insurer"?: string | null,"manager_id"?: string | null,"notes"?: string | null,"occurred_on"?: string | null,"policy_number"?: string | null,"status"?: Database["public"]['Enums']["claim_status"],"updated_at"?: string,"visit_at"?: string | null
                  }
                  Update: {
                    "adjuster_name"?: string | null,"adjuster_phone"?: string | null,"claim_number"?: string | null,"code"?: string,"communicated_on"?: string | null,"community_id"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"incident_id"?: string | null,"insurer"?: string | null,"manager_id"?: string | null,"notes"?: string | null,"occurred_on"?: string | null,"policy_number"?: string | null,"status"?: Database["public"]['Enums']["claim_status"],"updated_at"?: string,"visit_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "claims_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "claims_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "claims_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "claims_incident_id_fkey"
      columns: ["incident_id"]
isOneToOne: false
      referencedRelation: "incidents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "claims_incident_id_fkey"
      columns: ["incident_id"]
isOneToOne: false
      referencedRelation: "incidents_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "claims_manager_id_fkey"
      columns: ["manager_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"code_counters": {
                  Row: {
                    "last_value": number,"prefix": string,"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "last_value"?: number,"prefix": string,"year": number
                  }
                  Update: {
                    "last_value"?: number,"prefix"?: string,"year"?: number
                  }
                  Relationships: [
                    
                  ]
                },"communities": {
                  Row: {
                    "active": boolean,"address": string | null,"city": string | null,"code": string,"created_at": string,"created_by": string | null,"id": string,"last_activity_at": string,"manager_id": string | null,"name": string,"notes": string | null,"postal_code": string | null,"president_contact": string | null,"president_name": string | null,"registered_on": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"address"?: string | null,"city"?: string | null,"code": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"last_activity_at"?: string,"manager_id"?: string | null,"name": string,"notes"?: string | null,"postal_code"?: string | null,"president_contact"?: string | null,"president_name"?: string | null,"registered_on"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"address"?: string | null,"city"?: string | null,"code"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"last_activity_at"?: string,"manager_id"?: string | null,"name"?: string,"notes"?: string | null,"postal_code"?: string | null,"president_contact"?: string | null,"president_name"?: string | null,"registered_on"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "communities_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "communities_manager_id_fkey"
      columns: ["manager_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"community_contacts": {
                  Row: {
                    "community_id": string,"created_at": string,"created_by": string | null,"email": string | null,"id": string,"name": string,"notes": string | null,"phone": string | null,"role": string | null,"unit": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "community_id": string,"created_at"?: string,"created_by"?: string | null,"email"?: string | null,"id"?: string,"name": string,"notes"?: string | null,"phone"?: string | null,"role"?: string | null,"unit"?: string | null
                  }
                  Update: {
                    "community_id"?: string,"created_at"?: string,"created_by"?: string | null,"email"?: string | null,"id"?: string,"name"?: string,"notes"?: string | null,"phone"?: string | null,"role"?: string | null,"unit"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "community_contacts_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_contacts_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_contacts_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"community_providers": {
                  Row: {
                    "community_id": string,"created_at": string,"provider_id": string,"service": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "community_id": string,"created_at"?: string,"provider_id": string,"service"?: string | null
                  }
                  Update: {
                    "community_id"?: string,"created_at"?: string,"provider_id"?: string,"service"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "community_providers_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_providers_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_providers_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers"
      referencedColumns: ["id"]
    }
                  ]
                },"documents": {
                  Row: {
                    "archived_at": string | null,"archived_by": string | null,"budget_id": string | null,"claim_id": string | null,"community_id": string | null,"created_at": string,"description": string | null,"doc_type": string,"file_name": string,"id": string,"incident_id": string | null,"invoice_id": string | null,"mime_type": string | null,"provider_id": string | null,"size_bytes": number | null,"storage_path": string,"task_id": string | null,"uploaded_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"archived_by"?: string | null,"budget_id"?: string | null,"claim_id"?: string | null,"community_id"?: string | null,"created_at"?: string,"description"?: string | null,"doc_type"?: string,"file_name": string,"id"?: string,"incident_id"?: string | null,"invoice_id"?: string | null,"mime_type"?: string | null,"provider_id"?: string | null,"size_bytes"?: number | null,"storage_path": string,"task_id"?: string | null,"uploaded_by"?: string | null
                  }
                  Update: {
                    "archived_at"?: string | null,"archived_by"?: string | null,"budget_id"?: string | null,"claim_id"?: string | null,"community_id"?: string | null,"created_at"?: string,"description"?: string | null,"doc_type"?: string,"file_name"?: string,"id"?: string,"incident_id"?: string | null,"invoice_id"?: string | null,"mime_type"?: string | null,"provider_id"?: string | null,"size_bytes"?: number | null,"storage_path"?: string,"task_id"?: string | null,"uploaded_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "documents_archived_by_fkey"
      columns: ["archived_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_budget_id_fkey"
      columns: ["budget_id"]
isOneToOne: false
      referencedRelation: "budgets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_budget_id_fkey"
      columns: ["budget_id"]
isOneToOne: false
      referencedRelation: "budgets_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_claim_id_fkey"
      columns: ["claim_id"]
isOneToOne: false
      referencedRelation: "claims"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_claim_id_fkey"
      columns: ["claim_id"]
isOneToOne: false
      referencedRelation: "claims_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_incident_id_fkey"
      columns: ["incident_id"]
isOneToOne: false
      referencedRelation: "incidents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_incident_id_fkey"
      columns: ["incident_id"]
isOneToOne: false
      referencedRelation: "incidents_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_invoice_id_fkey"
      columns: ["invoice_id"]
isOneToOne: false
      referencedRelation: "invoices"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_invoice_id_fkey"
      columns: ["invoice_id"]
isOneToOne: false
      referencedRelation: "invoices_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"import_batches": {
                  Row: {
                    "created_at": string,"created_by": string | null,"document_id": string | null,"file_name": string,"id": string,"kind": string,"report": Json | null,"rows_imported": number,"rows_skipped": number,"rows_total": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"document_id"?: string | null,"file_name": string,"id"?: string,"kind": string,"report"?: Json | null,"rows_imported"?: number,"rows_skipped"?: number,"rows_total"?: number
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"document_id"?: string | null,"file_name"?: string,"id"?: string,"kind"?: string,"report"?: Json | null,"rows_imported"?: number,"rows_skipped"?: number,"rows_total"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "import_batches_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "import_batches_document_id_fkey"
      columns: ["document_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id"]
    }
                  ]
                },"incidents": {
                  Row: {
                    "category_id": string | null,"closed_at": string | null,"closed_by": string | null,"code": string,"communicated_on": string | null,"community_id": string,"created_at": string,"created_by": string | null,"description": string | null,"due_on": string | null,"id": string,"last_activity_at": string,"manager_id": string | null,"notes": string | null,"planned_on": string | null,"priority": Database["public"]['Enums']["incident_priority"],"provider_id": string | null,"reporter_contact": string | null,"reporter_name": string | null,"reporter_unit": string | null,"status": Database["public"]['Enums']["incident_status"],"subcategory_id": string | null,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id"?: string | null,"closed_at"?: string | null,"closed_by"?: string | null,"code"?: string,"communicated_on"?: string | null,"community_id": string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"due_on"?: string | null,"id"?: string,"last_activity_at"?: string,"manager_id"?: string | null,"notes"?: string | null,"planned_on"?: string | null,"priority"?: Database["public"]['Enums']["incident_priority"],"provider_id"?: string | null,"reporter_contact"?: string | null,"reporter_name"?: string | null,"reporter_unit"?: string | null,"status"?: Database["public"]['Enums']["incident_status"],"subcategory_id"?: string | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "category_id"?: string | null,"closed_at"?: string | null,"closed_by"?: string | null,"code"?: string,"communicated_on"?: string | null,"community_id"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"due_on"?: string | null,"id"?: string,"last_activity_at"?: string,"manager_id"?: string | null,"notes"?: string | null,"planned_on"?: string | null,"priority"?: Database["public"]['Enums']["incident_priority"],"provider_id"?: string | null,"reporter_contact"?: string | null,"reporter_name"?: string | null,"reporter_unit"?: string | null,"status"?: Database["public"]['Enums']["incident_status"],"subcategory_id"?: string | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "incidents_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "incidents_closed_by_fkey"
      columns: ["closed_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "incidents_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "incidents_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "incidents_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "incidents_manager_id_fkey"
      columns: ["manager_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "incidents_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "incidents_subcategory_id_fkey"
      columns: ["subcategory_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"invoices": {
                  Row: {
                    "base_amount": number,"budget_id": string | null,"community_id": string,"created_at": string,"created_by": string | null,"id": string,"incident_id": string | null,"invoice_date": string,"invoice_number": string,"notes": string | null,"provider_id": string,"received_on": string,"status": Database["public"]['Enums']["invoice_status"],"total_amount": number | null,"updated_at": string,"vat_amount": number | null,"vat_rate": number
                  }
                  ComputedFields: never
                  Insert: {
                    "base_amount": number,"budget_id"?: string | null,"community_id": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"incident_id"?: string | null,"invoice_date": string,"invoice_number": string,"notes"?: string | null,"provider_id": string,"received_on"?: string,"status"?: Database["public"]['Enums']["invoice_status"],"total_amount"?: never,"updated_at"?: string,"vat_amount"?: never,"vat_rate"?: number
                  }
                  Update: {
                    "base_amount"?: number,"budget_id"?: string | null,"community_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"incident_id"?: string | null,"invoice_date"?: string,"invoice_number"?: string,"notes"?: string | null,"provider_id"?: string,"received_on"?: string,"status"?: Database["public"]['Enums']["invoice_status"],"total_amount"?: never,"updated_at"?: string,"vat_amount"?: never,"vat_rate"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "invoices_budget_id_fkey"
      columns: ["budget_id"]
isOneToOne: false
      referencedRelation: "budgets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoices_budget_id_fkey"
      columns: ["budget_id"]
isOneToOne: false
      referencedRelation: "budgets_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoices_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoices_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoices_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoices_incident_id_fkey"
      columns: ["incident_id"]
isOneToOne: false
      referencedRelation: "incidents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoices_incident_id_fkey"
      columns: ["incident_id"]
isOneToOne: false
      referencedRelation: "incidents_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoices_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string | null,"created_at": string,"dedupe_key": string | null,"id": string,"kind": string,"link": string | null,"read_at": string | null,"recipient_id": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"dedupe_key"?: string | null,"id"?: string,"kind": string,"link"?: string | null,"read_at"?: string | null,"recipient_id": string,"title": string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"dedupe_key"?: string | null,"id"?: string,"kind"?: string,"link"?: string | null,"read_at"?: string | null,"recipient_id"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount": number,"confirmed_by": string,"created_at": string,"id": string,"invoice_id": string,"notes": string | null,"paid_on": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"confirmed_by": string,"created_at"?: string,"id"?: string,"invoice_id": string,"notes"?: string | null,"paid_on": string
                  }
                  Update: {
                    "amount"?: number,"confirmed_by"?: string,"created_at"?: string,"id"?: string,"invoice_id"?: string,"notes"?: string | null,"paid_on"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_confirmed_by_fkey"
      columns: ["confirmed_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_invoice_id_fkey"
      columns: ["invoice_id"]
isOneToOne: false
      referencedRelation: "invoices"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_invoice_id_fkey"
      columns: ["invoice_id"]
isOneToOne: false
      referencedRelation: "invoices_view"
      referencedColumns: ["id"]
    }
                  ]
                },"provider_specialties": {
                  Row: {
                    "category_id": string,"provider_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": string,"provider_id": string
                  }
                  Update: {
                    "category_id"?: string,"provider_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "provider_specialties_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "provider_specialties_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers"
      referencedColumns: ["id"]
    }
                  ]
                },"providers": {
                  Row: {
                    "active": boolean,"address": string | null,"company_name": string | null,"contact_person": string | null,"created_at": string,"created_by": string | null,"email": string | null,"id": string,"notes": string | null,"phone": string | null,"tax_id": string | null,"trade_name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"address"?: string | null,"company_name"?: string | null,"contact_person"?: string | null,"created_at"?: string,"created_by"?: string | null,"email"?: string | null,"id"?: string,"notes"?: string | null,"phone"?: string | null,"tax_id"?: string | null,"trade_name": string,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"address"?: string | null,"company_name"?: string | null,"contact_person"?: string | null,"created_at"?: string,"created_by"?: string | null,"email"?: string | null,"id"?: string,"notes"?: string | null,"phone"?: string | null,"tax_id"?: string | null,"trade_name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "providers_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"staff": {
                  Row: {
                    "active": boolean,"approval_limit": number | null,"avatar_path": string | null,"created_at": string,"email": string | null,"full_name": string,"id": string,"invited_at": string | null,"phone": string | null,"position": string,"role": Database["public"]['Enums']["staff_role"],"short_name": string,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"approval_limit"?: number | null,"avatar_path"?: string | null,"created_at"?: string,"email"?: string | null,"full_name": string,"id"?: string,"invited_at"?: string | null,"phone"?: string | null,"position": string,"role"?: Database["public"]['Enums']["staff_role"],"short_name": string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"approval_limit"?: number | null,"avatar_path"?: string | null,"created_at"?: string,"email"?: string | null,"full_name"?: string,"id"?: string,"invited_at"?: string | null,"phone"?: string | null,"position"?: string,"role"?: Database["public"]['Enums']["staff_role"],"short_name"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"status_labels": {
                  Row: {
                    "active": boolean,"entity": string,"key": string,"label": string,"sort_order": number,"tone": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"entity": string,"key": string,"label": string,"sort_order"?: number,"tone"?: string
                  }
                  Update: {
                    "active"?: boolean,"entity"?: string,"key"?: string,"label"?: string,"sort_order"?: number,"tone"?: string
                  }
                  Relationships: [
                    
                  ]
                },"tasks": {
                  Row: {
                    "assignee_id": string | null,"claim_id": string | null,"created_at": string,"created_by": string | null,"done": boolean,"done_at": string | null,"done_by": string | null,"due_on": string | null,"id": string,"incident_id": string | null,"notes": string | null,"sort_order": number,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignee_id"?: string | null,"claim_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"done"?: boolean,"done_at"?: string | null,"done_by"?: string | null,"due_on"?: string | null,"id"?: string,"incident_id"?: string | null,"notes"?: string | null,"sort_order"?: number,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "assignee_id"?: string | null,"claim_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"done"?: boolean,"done_at"?: string | null,"done_by"?: string | null,"due_on"?: string | null,"id"?: string,"incident_id"?: string | null,"notes"?: string | null,"sort_order"?: number,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_assignee_id_fkey"
      columns: ["assignee_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_claim_id_fkey"
      columns: ["claim_id"]
isOneToOne: false
      referencedRelation: "claims"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_claim_id_fkey"
      columns: ["claim_id"]
isOneToOne: false
      referencedRelation: "claims_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_done_by_fkey"
      columns: ["done_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_incident_id_fkey"
      columns: ["incident_id"]
isOneToOne: false
      referencedRelation: "incidents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_incident_id_fkey"
      columns: ["incident_id"]
isOneToOne: false
      referencedRelation: "incidents_view"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "activity_view": {
                  Row: {
                    "actor_id": string | null,"actor_name": string | null,"body": string | null,"budget_id": string | null,"changes": Json | null,"claim_id": string | null,"community_id": string | null,"community_name": string | null,"corrects_id": string | null,"counterpart": string | null,"created_at": string,"document_id": string | null,"id": string,"incident_code": string | null,"incident_id": string | null,"incident_title": string | null,"invoice_id": string | null,"kind": string,"occurred_at": string,"provider_id": string | null,"summary": string,"task_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "activity_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_budget_id_fkey"
      columns: ["budget_id"]
isOneToOne: false
      referencedRelation: "budgets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_budget_id_fkey"
      columns: ["budget_id"]
isOneToOne: false
      referencedRelation: "budgets_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_claim_id_fkey"
      columns: ["claim_id"]
isOneToOne: false
      referencedRelation: "claims"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_claim_id_fkey"
      columns: ["claim_id"]
isOneToOne: false
      referencedRelation: "claims_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_corrects_id_fkey"
      columns: ["corrects_id"]
isOneToOne: false
      referencedRelation: "activity"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_corrects_id_fkey"
      columns: ["corrects_id"]
isOneToOne: false
      referencedRelation: "activity_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_document_id_fkey"
      columns: ["document_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_incident_id_fkey"
      columns: ["incident_id"]
isOneToOne: false
      referencedRelation: "incidents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_incident_id_fkey"
      columns: ["incident_id"]
isOneToOne: false
      referencedRelation: "incidents_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_invoice_id_fkey"
      columns: ["invoice_id"]
isOneToOne: false
      referencedRelation: "invoices"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_invoice_id_fkey"
      columns: ["invoice_id"]
isOneToOne: false
      referencedRelation: "invoices_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"budgets_view": {
                  Row: {
                    "approval_kind": Database["public"]['Enums']["authorization_kind"] | null,"approved_at": string | null,"approved_by": string | null,"approved_by_name": string | null,"base_amount": number | null,"code": string,"community_id": string,"community_name": string,"concept": string,"conditions": string | null,"created_at": string,"created_by": string | null,"description": string | null,"execution_term": string | null,"has_president_authorization": boolean | null,"id": string,"incident_code": string | null,"incident_id": string | null,"incident_title": string | null,"provider_id": string | null,"provider_name": string | null,"received_on": string | null,"rejected_reason": string | null,"requested_on": string | null,"requires_superior": boolean,"responsible_id": string | null,"responsible_name": string | null,"selected": boolean,"status": Database["public"]['Enums']["budget_status"],"total_amount": number | null,"updated_at": string,"valid_until": string | null,"vat_amount": number | null,"vat_rate": number
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "budgets_approved_by_fkey"
      columns: ["approved_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "budgets_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "budgets_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "budgets_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "budgets_incident_id_fkey"
      columns: ["incident_id"]
isOneToOne: false
      referencedRelation: "incidents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "budgets_incident_id_fkey"
      columns: ["incident_id"]
isOneToOne: false
      referencedRelation: "incidents_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "budgets_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers"
      referencedColumns: ["id"]
    }
                  ]
                },"claims_view": {
                  Row: {
                    "adjuster_name": string | null,"adjuster_phone": string | null,"claim_number": string | null,"code": string,"communicated_on": string | null,"community_id": string,"community_name": string,"created_at": string,"created_by": string | null,"description": string | null,"id": string,"incident_code": string | null,"incident_id": string | null,"insurer": string | null,"manager_id": string | null,"manager_name": string | null,"notes": string | null,"occurred_on": string | null,"policy_number": string | null,"status": Database["public"]['Enums']["claim_status"],"updated_at": string,"visit_at": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "claims_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "claims_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "claims_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "claims_incident_id_fkey"
      columns: ["incident_id"]
isOneToOne: false
      referencedRelation: "incidents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "claims_incident_id_fkey"
      columns: ["incident_id"]
isOneToOne: false
      referencedRelation: "incidents_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "claims_manager_id_fkey"
      columns: ["manager_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"communities_view": {
                  Row: {
                    "active": boolean,"address": string | null,"city": string | null,"closed_incidents": number | null,"code": string,"created_at": string,"created_by": string | null,"id": string,"last_activity_at": string,"manager_id": string | null,"manager_name": string | null,"name": string,"notes": string | null,"open_incidents": number | null,"overdue_incidents": number | null,"postal_code": string | null,"president_contact": string | null,"president_name": string | null,"registered_on": string | null,"updated_at": string,"urgent_incidents": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "communities_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "communities_manager_id_fkey"
      columns: ["manager_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"incidents_view": {
                  Row: {
                    "category_id": string | null,"category_name": string | null,"closed_at": string | null,"closed_by": string | null,"code": string,"communicated_on": string | null,"community_code": string,"community_id": string,"community_manager_id": string | null,"community_name": string,"created_at": string,"created_by": string | null,"created_by_name": string | null,"description": string | null,"due_on": string | null,"id": string,"is_open": boolean | null,"is_overdue": boolean | null,"last_activity_at": string,"manager_id": string | null,"manager_name": string | null,"next_task_due": string | null,"notes": string | null,"planned_on": string | null,"priority": Database["public"]['Enums']["incident_priority"],"priority_rank": number | null,"provider_id": string | null,"provider_name": string | null,"reporter_contact": string | null,"reporter_name": string | null,"reporter_unit": string | null,"status": Database["public"]['Enums']["incident_status"],"subcategory_id": string | null,"subcategory_name": string | null,"tasks_done": number | null,"tasks_total": number | null,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "communities_manager_id_fkey"
      columns: ["community_manager_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "incidents_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "incidents_closed_by_fkey"
      columns: ["closed_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "incidents_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "incidents_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "incidents_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "incidents_manager_id_fkey"
      columns: ["manager_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "incidents_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "incidents_subcategory_id_fkey"
      columns: ["subcategory_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"invoices_view": {
                  Row: {
                    "base_amount": number,"budget_code": string | null,"budget_id": string | null,"community_id": string,"community_name": string,"created_at": string,"created_by": string | null,"id": string,"incident_code": string | null,"incident_id": string | null,"invoice_date": string,"invoice_number": string,"last_paid_on": string | null,"notes": string | null,"paid_amount": number | null,"provider_id": string,"provider_name": string,"received_on": string,"status": Database["public"]['Enums']["invoice_status"],"total_amount": number | null,"updated_at": string,"vat_amount": number | null,"vat_rate": number
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "invoices_budget_id_fkey"
      columns: ["budget_id"]
isOneToOne: false
      referencedRelation: "budgets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoices_budget_id_fkey"
      columns: ["budget_id"]
isOneToOne: false
      referencedRelation: "budgets_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoices_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoices_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoices_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoices_incident_id_fkey"
      columns: ["incident_id"]
isOneToOne: false
      referencedRelation: "incidents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoices_incident_id_fkey"
      columns: ["incident_id"]
isOneToOne: false
      referencedRelation: "incidents_view"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoices_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "apply_checklist":
{ Args: { "p_claim"?: string,"p_incident"?: string,"p_template": string }; Returns: number
                           },
"approve_budget":
{ Args: { "p_budget": string,"p_notes"?: string }; Returns: Json
                           },
"budget_approval_check":
{ Args: { "p_budget": string }; Returns: Json
                           },
"budget_responsible":
{ Args: { "p_budget": string }; Returns: string
                           },
"can_edit_budget":
{ Args: { "p_budget": string }; Returns: boolean
                           },
"can_edit_claim":
{ Args: { "p_claim": string }; Returns: boolean
                           },
"can_edit_community":
{ Args: { "p_community": string }; Returns: boolean
                           },
"can_edit_incident":
{ Args: { "p_incident": string }; Returns: boolean
                           },
"confirm_payment":
{ Args: { "p_amount": number,"p_invoice": string,"p_notes"?: string,"p_paid_on": string }; Returns: Json
                           },
"current_staff_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"current_staff_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["staff_role"]
                           },
"dashboard_stats":
{ Args: { "p_staff"?: string }; Returns: Json
                           },
"generate_reminders":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"in_workflow":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_supervisor":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"log_activity":
{ Args: { "p_body"?: string,"p_budget"?: string,"p_changes"?: Json,"p_claim"?: string,"p_community": string,"p_document"?: string,"p_incident"?: string,"p_invoice"?: string,"p_kind": string,"p_provider"?: string,"p_summary": string,"p_task"?: string }; Returns: undefined
                           },
"next_code":
{ Args: { "p_prefix": string }; Returns: string
                           },
"notify":
{ Args: { "p_body": string,"p_dedupe"?: string,"p_kind": string,"p_link": string,"p_recipient": string,"p_title": string }; Returns: undefined
                           },
"notify_supervisors":
{ Args: { "p_body": string,"p_dedupe"?: string,"p_except"?: string,"p_kind": string,"p_link": string,"p_title": string }; Returns: undefined
                           },
"reject_budget":
{ Args: { "p_budget": string,"p_reason": string }; Returns: undefined
                           },
"request_superior_approval":
{ Args: { "p_budget": string,"p_notes"?: string }; Returns: undefined
                           },
"row_diff":
{ Args: { "p_ignore": (string)[],"p_new": Json,"p_old": Json }; Returns: Json
                           },
"status_label":
{ Args: { "p_entity": string,"p_key": string }; Returns: string
                           },
"today_madrid":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"update_my_profile":
{ Args: { "p_avatar_path": string,"p_phone": string }; Returns: undefined
                           }
          }
          Enums: {
            "authorization_kind": "presidente"|"aprobacion_interna"|"autorizacion_superior","budget_status": "solicitado"|"recibido"|"pendiente_autorizacion"|"aprobado"|"rechazado"|"cancelado","calendar_kind": "reparacion"|"visita_proveedor"|"visita_perito"|"fecha_limite"|"seguimiento"|"recordatorio"|"otro","checklist_kind": "reparacion"|"siniestro"|"otro","claim_status": "pendiente_comunicar"|"comunicado"|"pendiente_perito"|"visita_programada"|"pendiente_valoracion"|"aceptado"|"rechazado"|"en_reparacion"|"finalizado"|"cerrado","incident_priority": "baja"|"normal"|"alta"|"urgente","incident_status": "nueva"|"pendiente_revision"|"en_curso"|"pendiente_proveedor"|"presupuesto_solicitado"|"presupuesto_recibido"|"pendiente_aprobacion"|"aprobada"|"reparacion_programada"|"reparacion_realizada"|"factura_pendiente"|"pendiente_pago"|"resuelta"|"cerrada"|"cancelada","invoice_status": "recibida"|"pendiente_revision"|"pendiente_pago"|"pagada"|"discrepancia","staff_role": "direccion"|"coordinacion"|"gestora"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "authorization_kind": ["presidente", "aprobacion_interna", "autorizacion_superior"],"budget_status": ["solicitado", "recibido", "pendiente_autorizacion", "aprobado", "rechazado", "cancelado"],"calendar_kind": ["reparacion", "visita_proveedor", "visita_perito", "fecha_limite", "seguimiento", "recordatorio", "otro"],"checklist_kind": ["reparacion", "siniestro", "otro"],"claim_status": ["pendiente_comunicar", "comunicado", "pendiente_perito", "visita_programada", "pendiente_valoracion", "aceptado", "rechazado", "en_reparacion", "finalizado", "cerrado"],"incident_priority": ["baja", "normal", "alta", "urgente"],"incident_status": ["nueva", "pendiente_revision", "en_curso", "pendiente_proveedor", "presupuesto_solicitado", "presupuesto_recibido", "pendiente_aprobacion", "aprobada", "reparacion_programada", "reparacion_realizada", "factura_pendiente", "pendiente_pago", "resuelta", "cerrada", "cancelada"],"invoice_status": ["recibida", "pendiente_revision", "pendiente_pago", "pagada", "discrepancia"],"staff_role": ["direccion", "coordinacion", "gestora"]
          }
        }
} as const
