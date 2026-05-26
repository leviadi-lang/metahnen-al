import { describe, it, expect, beforeEach } from 'vitest';
import { TOOLS } from '../../src/tools/registry.js';
import { LEAD_INTAKE_TOOLS } from '../../src/agents/lead-intake/index.js';
import { resetCrmClient, getCrmClient } from '../../src/integrations/crm/mock.js';
import type { MockCrmClient } from '../../src/integrations/crm/mock.js';
import { resetWhatsappClient, getWhatsappClient } from '../../src/integrations/whatsapp/mock.js';
import type { MockWhatsappClient } from '../../src/integrations/whatsapp/mock.js';
import { resetGmailClient, getGmailClient } from '../../src/integrations/gmail/mock.js';
import type { MockGmailClient } from '../../src/integrations/gmail/mock.js';

/**
 * MVP-1 flow contract test.
 *
 * This does NOT invoke the Anthropic API. Instead it directly drives each of the 4
 * tools the Lead Intake agent is expected to call, in the order the prompt
 * mandates, and verifies that the mock integrations recorded the expected effects.
 *
 * If this test passes, the wiring from tool → mock provider is intact for the MVP-1
 * flow. A live LLM run can confirm the agent actually invokes these tools in the
 * right order; that test belongs in a separate integration suite that costs API
 * credits and is excluded from CI by default.
 */
describe('MVP-1 — Lead Intake flow (contract test)', () => {
  beforeEach(() => {
    resetCrmClient();
    resetWhatsappClient();
    resetGmailClient();
  });

  it('exposes exactly the 4 tools the agent needs in LEAD_INTAKE_TOOLS', () => {
    expect(LEAD_INTAKE_TOOLS).toEqual([
      'create_crm_process',
      'send_whatsapp_message',
      'send_email',
      'create_followup_task',
    ]);

    for (const toolName of LEAD_INTAKE_TOOLS) {
      expect(TOOLS[toolName]).toBeDefined();
      expect(TOOLS[toolName].name).toBe(toolName);
    }
  });

  it('runs the 4-step MVP flow against the mocks end-to-end', async () => {
    const advisorEmail = 'adi@cnt-fin.com';
    const advisorUserId = 'advisor_adi';
    const leadPhone = '0521112233';
    const leadName = 'נועה ישראלי';

    // Step 1 — create_crm_process
    const createProcessResult = await TOOLS.create_crm_process.run(
      {
        full_name: leadName,
        phone: leadPhone,
        email: 'noa@example.co.il',
        lead_source: 'facebook',
        process_type: 'retirement_plan',
        initial_notes: 'מעוניינת בייעוץ פרישה',
      },
      undefined,
    );

    const process = JSON.parse(createProcessResult as string) as {
      process_id: string;
      customer_id: string;
    };
    expect(process.process_id).toMatch(/^proc_/);
    expect(process.customer_id).toMatch(/^cust_/);

    // Step 2 — send_whatsapp_message
    await TOOLS.send_whatsapp_message.run(
      {
        to_phone: leadPhone,
        body: `היי ${leadName}! קיבלנו את הפרטים שלך. נחזור אליך בקרוב לתאם פגישת ייעוץ. תודה!`,
      },
      undefined,
    );

    // Step 3 — send_email (advisor notification)
    await TOOLS.send_email.run(
      {
        to: advisorEmail,
        subject: `[Lead intake] ${leadName} — facebook`,
        body_text: `New lead created.\n\nName: ${leadName}\nPhone: ${leadPhone}\nSource: facebook\nProcess: ${process.process_id}`,
      },
      undefined,
    );

    // Step 4 — create_followup_task
    const followupResult = await TOOLS.create_followup_task.run(
      {
        assigned_to: advisorUserId,
        due_date: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        task_type: 'lead_followup',
        description: 'התקשרי לליד החדש לתיאום פגישת ייעוץ',
        customer_id: process.customer_id,
      },
      undefined,
    );
    const task = JSON.parse(followupResult as string) as {
      task_id: string;
      assigned_to: string;
      completion_status: string;
    };
    expect(task.task_id).toMatch(/^task_/);
    expect(task.assigned_to).toBe(advisorUserId);
    expect(task.completion_status).toBe('pending');

    // ---- Verify the side effects landed on each mock ----

    // CRM has the new customer
    const crm = getCrmClient() as MockCrmClient;
    const stored = await crm.findCustomerByPhone(leadPhone);
    expect(stored).not.toBeNull();
    expect(stored?.full_name).toBe(leadName);
    expect(stored?.lead_source).toBe('facebook');

    // CRM has the follow-up task pending for the advisor
    const tasks = await crm.listTasksForAdvisor(advisorUserId);
    const myTask = tasks.find((t) => t.task_id === task.task_id);
    expect(myTask?.completion_status).toBe('pending');
    expect(myTask?.task_type).toBe('lead_followup');

    // WhatsApp mock recorded the welcome message
    const wa = getWhatsappClient() as MockWhatsappClient;
    expect(wa.sent).toHaveLength(1);
    expect(wa.sent[0]?.to_phone).toBe(leadPhone);

    // Gmail mock recorded the advisor notification
    const gm = getGmailClient() as MockGmailClient;
    expect(gm.sent).toHaveLength(1);
    expect(gm.sent[0]?.to).toBe(advisorEmail);
  });

  it('create_crm_process is idempotent — re-running matches the existing customer by phone', async () => {
    const phone = '0529998877';

    const first = JSON.parse(
      (await TOOLS.create_crm_process.run(
        {
          full_name: 'דנה אבן',
          phone,
          lead_source: 'google',
          process_type: 'gemel_setup',
        },
        undefined,
      )) as string,
    ) as { customer_id: string };

    const second = JSON.parse(
      (await TOOLS.create_crm_process.run(
        {
          full_name: 'דנה אבן',
          phone,
          lead_source: 'google',
          process_type: 'pension_transfer',
        },
        undefined,
      )) as string,
    ) as { customer_id: string };

    expect(first.customer_id).toBe(second.customer_id);
  });
});
