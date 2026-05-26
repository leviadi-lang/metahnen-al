import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { ValidationError } from '../shared/errors.js';
import { handleInboundEvent } from '../orchestrator/master.js';
import type { InboundEvent } from '../shared/types.js';

const bodySchema = z.object({
  event_id: z.string().optional(),
  channel: z.enum(['whatsapp', 'email', 'webhook', 'internal']).default('webhook'),
  customer_id: z.string().optional(),
  text: z.string().min(1, 'text is required'),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const customerMessageRouter = Router();

customerMessageRouter.post(
  '/webhooks/customer-message',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid payload', parsed.error.flatten());
      }
      const event: InboundEvent = {
        event_id: parsed.data.event_id ?? `evt_${randomUUID().slice(0, 8)}`,
        channel: parsed.data.channel,
        ...(parsed.data.customer_id !== undefined && { customer_id: parsed.data.customer_id }),
        text: parsed.data.text,
        ...(parsed.data.payload !== undefined && { payload: parsed.data.payload }),
        received_at: new Date().toISOString(),
      };
      const result = await handleInboundEvent(event);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);
