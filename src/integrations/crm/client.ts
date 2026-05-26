import type {
  Customer,
  Lead,
  ProcessRecord,
  Task,
  CreateProcessInput,
  UpdateStatusInput,
} from './types.js';

/**
 * CRM client interface — both the mock and (future) real provider implement this.
 * All writes must be idempotent (Make.com may resend webhooks).
 */
export interface CrmClient {
  // Reads
  getCustomer(customerId: string): Promise<Customer | null>;
  findCustomerByPhone(phone: string): Promise<Customer | null>;
  findCustomerByEmail(email: string): Promise<Customer | null>;
  getProcess(processId: string): Promise<ProcessRecord | null>;
  listTasksForAdvisor(advisorId: string): Promise<Task[]>;

  // Writes
  createProcess(input: CreateProcessInput): Promise<ProcessRecord>;
  updateStatus(input: UpdateStatusInput): Promise<ProcessRecord>;
  createLead(lead: Omit<Lead, 'lead_id' | 'created_at'>): Promise<Lead>;
  createTask(task: Omit<Task, 'task_id' | 'created_at'>): Promise<Task>;

  // Maintenance — for tests / health check
  ping(): Promise<{ ok: true; provider: string }>;
}
