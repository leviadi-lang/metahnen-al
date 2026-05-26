import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod/v4';
import { getCrmClient } from '../integrations/crm/mock.js';
import { logger } from '../shared/logger.js';

const documentStatusEnum = z.enum([
  'received',
  'missing',
  'rejected',
  'expired',
  'reminder_sent',
]);

const inputSchema = z.object({
  customer_id: z.string().optional().describe('Customer ID — required if process_id not given.'),
  process_id: z.string().optional().describe('Process ID — required if customer_id not given.'),
  new_status: z
    .enum(['new', 'active', 'pending_docs', 'pending_signature', 'closed', 'inactive'])
    .optional(),
  new_stage: z
    .string()
    .optional()
    .describe('Internal stage label, e.g. "documents_pending", "meeting_scheduled", "signed".'),
  document_updates: z
    .record(z.string(), documentStatusEnum)
    .optional()
    .describe('Map of document_type → status. Document types use the document-classification taxonomy.'),
  note: z.string().optional().describe('Hebrew/English reasoning note attached to this update.'),
});

export const updateCrmStatusTool = betaZodTool({
  name: 'update_crm_status',
  description:
    'Update a customer process status, stage, and document statuses in the CRM. Provide either customer_id or process_id. Always idempotent.',
  inputSchema,
  run: async (input) => {
    const client = getCrmClient();
    const record = await client.updateStatus(input);
    logger.info({ tool: 'update_crm_status', processId: record.process_id }, 'tool.executed');
    return JSON.stringify(record);
  },
});
