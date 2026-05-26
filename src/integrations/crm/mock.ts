import { randomUUID } from 'node:crypto';
import { logger } from '../../shared/logger.js';
import { CrmDuplicateError } from '../../shared/errors.js';
import type { CrmClient } from './client.js';
import type {
  Customer,
  Lead,
  ProcessRecord,
  Task,
  CreateProcessInput,
  UpdateStatusInput,
} from './types.js';

/**
 * In-memory CRM mock with seeded Hebrew sample data.
 * Replace with a real provider implementation when ready.
 */
export class MockCrmClient implements CrmClient {
  private customers = new Map<string, Customer>();
  private processes = new Map<string, ProcessRecord>();
  private leads = new Map<string, Lead>();
  private tasks = new Map<string, Task>();

  constructor() {
    this.seed();
  }

  private seed(): void {
    const now = new Date().toISOString();

    const samples: Customer[] = [
      {
        customer_id: 'cust_001',
        full_name: 'דניאל כהן',
        phone: '0501234567',
        email: 'daniel.cohen@example.co.il',
        status: 'active',
        assigned_advisor: 'advisor_adi',
        lead_source: 'referral',
        documents_status: {
          id_card: 'received',
          pension_statement: 'received',
          severance_form: 'missing',
        },
        created_at: now,
        updated_at: now,
        notes: 'לקוח קיים — טיפול בכספי פיצויים אחרי סיום עבודה',
      },
      {
        customer_id: 'cust_002',
        full_name: 'שירה לוי',
        phone: '0529876543',
        email: 'shira.levi@example.co.il',
        status: 'pending_docs',
        assigned_advisor: 'advisor_adi',
        lead_source: 'facebook',
        documents_status: {
          id_card: 'received',
          salary_slip: 'missing',
          pension_statement: 'reminder_sent',
        },
        created_at: now,
        updated_at: now,
      },
      {
        customer_id: 'cust_003',
        full_name: 'יוסי אברהמי',
        phone: '0547654321',
        email: 'yossi.a@example.co.il',
        status: 'new',
        assigned_advisor: 'advisor_adi',
        lead_source: 'google',
        documents_status: {},
        created_at: now,
        updated_at: now,
        notes: 'מתעניין בתכנון פרישה — גיל 58',
      },
    ];

    for (const c of samples) this.customers.set(c.customer_id, c);
  }

  async getCustomer(customerId: string): Promise<Customer | null> {
    logger.debug({ customerId }, 'crm.mock.getCustomer');
    return this.customers.get(customerId) ?? null;
  }

  async findCustomerByPhone(phone: string): Promise<Customer | null> {
    const normalized = phone.replace(/\D/g, '');
    for (const c of this.customers.values()) {
      if (c.phone.replace(/\D/g, '') === normalized) return c;
    }
    return null;
  }

  async findCustomerByEmail(email: string): Promise<Customer | null> {
    const lower = email.toLowerCase();
    for (const c of this.customers.values()) {
      if (c.email.toLowerCase() === lower) return c;
    }
    return null;
  }

  async getProcess(processId: string): Promise<ProcessRecord | null> {
    return this.processes.get(processId) ?? null;
  }

  async listTasksForAdvisor(advisorId: string): Promise<Task[]> {
    return [...this.tasks.values()].filter((t) => t.assigned_to === advisorId);
  }

  async createProcess(input: CreateProcessInput): Promise<ProcessRecord> {
    // Deduplicate by phone — keep writes idempotent
    const existing = await this.findCustomerByPhone(input.phone);
    let customerId = existing?.customer_id;

    if (!customerId) {
      // Create a new customer record alongside the process
      customerId = `cust_${randomUUID().slice(0, 8)}`;
      const now = new Date().toISOString();
      this.customers.set(customerId, {
        customer_id: customerId,
        full_name: input.full_name,
        phone: input.phone,
        email: input.email ?? '',
        status: 'new',
        assigned_advisor: 'advisor_adi',
        lead_source: input.lead_source,
        documents_status: {},
        created_at: now,
        updated_at: now,
        notes: input.initial_notes,
      });
    } else if (input.email && existing && existing.email && existing.email !== input.email) {
      throw new CrmDuplicateError('phone', input.phone);
    }

    const processId = `proc_${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const record: ProcessRecord = {
      process_id: processId,
      customer_id: customerId,
      process_type: input.process_type,
      status: 'open',
      stage: 'intake',
      created_at: now,
      updated_at: now,
    };
    this.processes.set(processId, record);
    logger.info({ processId, customerId }, 'crm.mock.createProcess');
    return record;
  }

  async updateStatus(input: UpdateStatusInput): Promise<ProcessRecord> {
    let process: ProcessRecord | undefined;
    if (input.process_id) {
      process = this.processes.get(input.process_id);
    } else if (input.customer_id) {
      for (const p of this.processes.values()) {
        if (p.customer_id === input.customer_id) {
          process = p;
          break;
        }
      }
    }

    if (!process) {
      // Create a stub process so the call is idempotent
      const processId = `proc_${randomUUID().slice(0, 8)}`;
      const now = new Date().toISOString();
      process = {
        process_id: processId,
        customer_id: input.customer_id ?? `cust_unknown_${randomUUID().slice(0, 4)}`,
        process_type: 'unknown',
        status: 'open',
        stage: input.new_stage ?? 'intake',
        created_at: now,
        updated_at: now,
      };
      this.processes.set(processId, process);
    }

    if (input.new_stage) process.stage = input.new_stage;
    process.updated_at = new Date().toISOString();

    if (input.new_status && input.customer_id) {
      const customer = this.customers.get(input.customer_id);
      if (customer) {
        customer.status = input.new_status;
        customer.updated_at = process.updated_at;
        if (input.document_updates) {
          customer.documents_status = {
            ...customer.documents_status,
            ...input.document_updates,
          };
        }
      }
    }

    logger.info({ processId: process.process_id, note: input.note }, 'crm.mock.updateStatus');
    return process;
  }

  async createLead(input: Omit<Lead, 'lead_id' | 'created_at'>): Promise<Lead> {
    const leadId = `lead_${randomUUID().slice(0, 8)}`;
    const lead: Lead = {
      ...input,
      lead_id: leadId,
      created_at: new Date().toISOString(),
    };
    this.leads.set(leadId, lead);
    logger.info({ leadId, source: input.source }, 'crm.mock.createLead');
    return lead;
  }

  async createTask(input: Omit<Task, 'task_id' | 'created_at'>): Promise<Task> {
    const taskId = `task_${randomUUID().slice(0, 8)}`;
    const task: Task = {
      ...input,
      task_id: taskId,
      created_at: new Date().toISOString(),
    };
    this.tasks.set(taskId, task);
    return task;
  }

  async ping(): Promise<{ ok: true; provider: string }> {
    return { ok: true, provider: 'mock' };
  }
}

let cached: CrmClient | undefined;

export function getCrmClient(): CrmClient {
  if (!cached) cached = new MockCrmClient();
  return cached;
}

/** Reset for tests. */
export function resetCrmClient(): void {
  cached = undefined;
}
