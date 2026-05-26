import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod/v4';
import { getGmailClient } from '../integrations/gmail/mock.js';
import { logger } from '../shared/logger.js';

const inputSchema = z.object({
  to: z.string().email().describe('Recipient email address.'),
  subject: z.string().min(1).max(256).describe('Hebrew subject line.'),
  body_text: z.string().min(1).describe('Plain-text body — Hebrew for customer emails.'),
  body_html: z.string().optional().describe('Optional HTML body for richer formatting.'),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
});

export const sendEmailTool = betaZodTool({
  name: 'send_email',
  description:
    'Send an email to a customer or internal staff. Customer-facing subjects and bodies must be in Hebrew. Returns the provider message_id.',
  inputSchema,
  run: async (input) => {
    const client = getGmailClient();
    const result = await client.send(input);
    logger.info({ tool: 'send_email', result }, 'tool.executed');
    return JSON.stringify(result);
  },
});
