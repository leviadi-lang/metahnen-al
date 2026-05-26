import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod/v4';
import { getCrmClient } from '../integrations/crm/mock.js';
import { logger } from '../shared/logger.js';

const inputSchema = z.object({
  full_name: z.string().min(1).describe('Customer full name (Hebrew).'),
  phone: z.string().min(9).describe('Israeli phone number.'),
  email: z.string().email().optional().describe('Customer email if available.'),
  lead_source: z
    .string()
    .describe('Source tag, e.g. facebook | google | referral | organic | walk_in.'),
  process_type: z
    .enum([
      'pension_transfer',
      'severance',
      'retirement_plan',
      'gemel_setup',
      'investment_policy',
      'general_consultation',
      'unknown',
    ])
    .describe('Primary process the customer needs help with.'),
  initial_notes: z.string().optional().describe('Hebrew notes captured at intake.'),
});

export const createCrmProcessTool = betaZodTool({
  name: 'create_crm_process',
  description:
    'Open a new customer process in the insurance CRM. Idempotent — if a customer with the same phone exists, attaches a new process to that customer. Returns process_id and customer_id.',
  inputSchema,
  run: async (input) => {
    const client = getCrmClient();
    const record = await client.createProcess(input);
    logger.info({ tool: 'create_crm_process', processId: record.process_id }, 'tool.executed');
    return JSON.stringify(record);
  },
});
