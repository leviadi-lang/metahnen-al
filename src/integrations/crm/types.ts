/** CRM domain types — modeled after the spec's Customer / Lead / Task objects. */

export type CustomerStatus =
  | 'new'
  | 'active'
  | 'pending_docs'
  | 'pending_signature'
  | 'closed'
  | 'inactive';

export type DocumentStatus = 'received' | 'missing' | 'rejected' | 'expired' | 'reminder_sent';

export type LeadIntent = 'cold' | 'warm' | 'hot';

export type TaskCompletionStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Customer {
  customer_id: string;
  full_name: string;
  phone: string;
  email: string;
  status: CustomerStatus;
  assigned_advisor: string;
  lead_source: string;
  documents_status: Record<string, DocumentStatus>;
  created_at: string;
  updated_at: string;
  notes?: string;
}

export interface Lead {
  lead_id: string;
  full_name: string;
  phone: string;
  email?: string;
  source: string;
  priority_score: number; // 1-10
  intent_level: LeadIntent;
  meeting_booked: boolean;
  created_at: string;
  raw_payload?: Record<string, unknown>;
}

export interface Task {
  task_id: string;
  assigned_to: string;
  due_date: string;
  task_type: string;
  description: string;
  completion_status: TaskCompletionStatus;
  customer_id?: string;
  created_at: string;
}

export interface ProcessRecord {
  process_id: string;
  customer_id: string;
  process_type: string; // e.g. 'pension_transfer', 'severance', 'retirement_plan'
  status: string;
  stage: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

/** Input shapes for write operations. */

export interface CreateProcessInput {
  customer_id?: string;
  full_name: string;
  phone: string;
  email?: string;
  lead_source: string;
  process_type: string;
  initial_notes?: string;
}

export interface UpdateStatusInput {
  customer_id?: string;
  process_id?: string;
  new_status?: CustomerStatus;
  new_stage?: string;
  document_updates?: Record<string, DocumentStatus>;
  note?: string;
}
