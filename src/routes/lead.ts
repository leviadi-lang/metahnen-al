import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { ValidationError } from '../shared/errors.js';
import { runLeadIntakeAgent } from '../agents/lead-intake/index.js';

const bodySchema = z.object({
  full_name: z.string().min(1),
  phone: z.string().min(9),
  email: z.string().email().optional(),
  source: z.string().default('webhook'),
  message: z.string().optional().describe('Free-form initial message from the lead (Hebrew).'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const leadRouter = Router();

leadRouter.post(
  '/webhooks/lead',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid lead payload', parsed.error.flatten());
      }
      const input = parsed.data;

      // Hand straight to the Lead Intake agent — Master is not in the loop
      // for cold leads (they arrive structured, not as customer messages).
      const userPrompt = [
        `New lead received from source: ${input.source}`,
        `Full name: ${input.full_name}`,
        `Phone: ${input.phone}`,
        input.email ? `Email: ${input.email}` : null,
        input.message ? `Message: ${input.message}` : null,
        input.metadata ? `Metadata: ${JSON.stringify(input.metadata)}` : null,
        '',
        'Validate the contact data, check for duplicates, open a CRM process, and send a welcome message in Hebrew.',
      ]
        .filter(Boolean)
        .join('\n');

      const result = await runLeadIntakeAgent(userPrompt);
      res.json({
        event_id: `lead_${randomUUID().slice(0, 8)}`,
        agent_result: result,
      });
    } catch (err) {
      next(err);
    }
  },
);
