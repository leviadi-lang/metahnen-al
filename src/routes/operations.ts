import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { ValidationError } from '../shared/errors.js';
import { runOperationsAgent } from '../agents/operations/index.js';

const bodySchema = z.object({
  task_type: z
    .enum([
      'classify_document',
      'document_chase',
      'process_audit',
      'meeting_summary',
      'generic',
    ])
    .default('generic'),
  customer_id: z.string().optional(),
  description: z.string().min(1).describe('Hebrew or English task description.'),
  attachments: z
    .array(z.object({ name: z.string(), text: z.string() }))
    .optional()
    .describe('Extracted text for any attached documents.'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const operationsRouter = Router();

operationsRouter.post(
  '/webhooks/operations',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid operations payload', parsed.error.flatten());
      }
      const input = parsed.data;
      const prompt = [
        `Task type: ${input.task_type}`,
        input.customer_id ? `Customer ID: ${input.customer_id}` : null,
        '',
        input.description,
        input.attachments?.length
          ? `\nAttachments:\n${input.attachments
              .map((a) => `--- ${a.name} ---\n${a.text}`)
              .join('\n\n')}`
          : null,
      ]
        .filter(Boolean)
        .join('\n');

      const result = await runOperationsAgent(prompt);
      res.json({
        event_id: `ops_${randomUUID().slice(0, 8)}`,
        agent_result: result,
      });
    } catch (err) {
      next(err);
    }
  },
);
