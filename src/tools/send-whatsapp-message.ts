import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod/v4';
import { getWhatsappClient } from '../integrations/whatsapp/mock.js';
import { logger } from '../shared/logger.js';

const inputSchema = z.object({
  to_phone: z.string().min(9).describe('Israeli phone number, e.g. 0501234567 or +972501234567'),
  body: z
    .string()
    .min(1)
    .max(4096)
    .describe(
      'Hebrew message body — warm, professional, concise. Required even when using a template.',
    ),
  template_name: z
    .string()
    .optional()
    .describe(
      'Approved WhatsApp Business template name. Required outside the 24h customer session window.',
    ),
  template_variables: z
    .record(z.string(), z.string())
    .optional()
    .describe('Key-value substitutions for the template body.'),
});

export const sendWhatsappMessageTool = betaZodTool({
  name: 'send_whatsapp_message',
  description:
    'Send a WhatsApp message to a customer in Hebrew. Use approved templates outside the 24-hour session window. Logs to CRM automatically. Returns the provider message_id.',
  inputSchema,
  run: async (input) => {
    const client = getWhatsappClient();
    const result = await client.send(input);
    logger.info({ tool: 'send_whatsapp_message', result }, 'tool.executed');
    return JSON.stringify(result);
  },
});
