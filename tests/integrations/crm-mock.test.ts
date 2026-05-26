import { describe, it, expect, beforeEach } from 'vitest';
import { MockCrmClient } from '../../src/integrations/crm/mock.js';

describe('MockCrmClient', () => {
  let client: MockCrmClient;

  beforeEach(() => {
    client = new MockCrmClient();
  });

  it('seeds 3 Hebrew sample customers', async () => {
    const c1 = await client.getCustomer('cust_001');
    expect(c1?.full_name).toBe('דניאל כהן');
    expect(c1?.status).toBe('active');

    const c2 = await client.getCustomer('cust_002');
    expect(c2?.full_name).toBe('שירה לוי');

    const c3 = await client.getCustomer('cust_003');
    expect(c3?.full_name).toBe('יוסי אברהמי');
  });

  it('finds a customer by phone number, ignoring formatting', async () => {
    const found = await client.findCustomerByPhone('050-123-4567');
    expect(found?.customer_id).toBe('cust_001');
  });

  it('creates a new process and an attached customer on first call', async () => {
    const process = await client.createProcess({
      full_name: 'נועה ישראלי',
      phone: '0526543210',
      email: 'noa@example.co.il',
      lead_source: 'facebook',
      process_type: 'retirement_plan',
      initial_notes: 'מעוניינת בייעוץ פרישה',
    });
    expect(process.process_id).toMatch(/^proc_/);
    expect(process.customer_id).toMatch(/^cust_/);
    expect(process.status).toBe('open');

    const customer = await client.getCustomer(process.customer_id);
    expect(customer?.full_name).toBe('נועה ישראלי');
    expect(customer?.lead_source).toBe('facebook');
  });

  it('createProcess is idempotent by phone — reuses existing customer', async () => {
    const first = await client.createProcess({
      full_name: 'תומר אבן',
      phone: '0541112222',
      lead_source: 'google',
      process_type: 'gemel_setup',
    });
    const second = await client.createProcess({
      full_name: 'תומר אבן',
      phone: '0541112222',
      lead_source: 'google',
      process_type: 'pension_transfer',
    });
    expect(first.customer_id).toBe(second.customer_id);
    expect(first.process_id).not.toBe(second.process_id);
  });

  it('updateStatus updates a customer status and document statuses', async () => {
    await client.updateStatus({
      customer_id: 'cust_002',
      new_status: 'pending_signature',
      document_updates: { salary_slip: 'received' },
    });

    const customer = await client.getCustomer('cust_002');
    expect(customer?.status).toBe('pending_signature');
    expect(customer?.documents_status.salary_slip).toBe('received');
  });

  it('ping reports the mock provider', async () => {
    const result = await client.ping();
    expect(result).toEqual({ ok: true, provider: 'mock' });
  });
});
