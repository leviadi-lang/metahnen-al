import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod/v4';
import { getCalendarClient } from '../integrations/calendar/mock.js';
import { logger } from '../shared/logger.js';

const inputSchema = z.object({
  title: z.string().min(1).describe('Hebrew title for the calendar event.'),
  start: z.string().datetime({ offset: true }).describe('ISO 8601 start time (with timezone).'),
  end: z.string().datetime({ offset: true }).describe('ISO 8601 end time (with timezone).'),
  attendees: z
    .array(z.string().email())
    .min(1)
    .describe('Attendee email addresses (customer + advisor).'),
  description: z.string().optional().describe('Hebrew agenda / pre-meeting notes.'),
  location: z
    .string()
    .optional()
    .describe('Physical address or Zoom/Meet link. Provide one when relevant.'),
});

export const scheduleMeetingTool = betaZodTool({
  name: 'schedule_meeting',
  description:
    'Create a calendar event with the customer and advisor as attendees. Returns event_id and link.',
  inputSchema,
  run: async (input) => {
    const client = getCalendarClient();
    const result = await client.schedule(input);
    logger.info({ tool: 'schedule_meeting', eventId: result.event_id }, 'tool.executed');
    return JSON.stringify(result);
  },
});
