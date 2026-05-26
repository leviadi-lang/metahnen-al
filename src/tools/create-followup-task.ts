import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod/v4';
import { getCrmClient } from '../integrations/crm/mock.js';
import { logger } from '../shared/logger.js';

const inputSchema = z.object({
  assigned_to: z
    .string()
    .min(1)
    .describe('Advisor user-id who owns the task, e.g. "advisor_adi".'),
  due_date: z
    .string()
    .datetime({ offset: true })
    .describe('ISO 8601 deadline including timezone offset, e.g. 2026-05-26T18:00:00+03:00.'),
  task_type: z
    .enum([
      'lead_followup',
      'document_chase',
      'meeting_followup',
      'compliance_review',
      'generic',
    ])
    .describe('Category for routing and reporting.'),
  description: z
    .string()
    .min(1)
    .describe('Hebrew description of what the advisor needs to do.'),
  customer_id: z.string().optional().describe('Customer ID this task is tied to, if known.'),
});

export const createFollowupTaskTool = betaZodTool({
  name: 'create_followup_task',
  description:
    'Create an internal follow-up task for the advisor in the CRM. Use this for every new lead so a human reaches out within the SLA window. Returns the task_id.',
  inputSchema,
  run: async (input) => {
    const client = getCrmClient();
    const task = await client.createTask({
      assigned_to: input.assigned_to,
      due_date: input.due_date,
      task_type: input.task_type,
      description: input.description,
      completion_status: 'pending',
      ...(input.customer_id !== undefined && { customer_id: input.customer_id }),
    });
    logger.info(
      { tool: 'create_followup_task', taskId: task.task_id, assignedTo: task.assigned_to },
      'tool.executed',
    );
    return JSON.stringify(task);
  },
});
