import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod/v4';
import { getAnthropicClient, subagentModel } from '../shared/claude-client.js';
import { logger } from '../shared/logger.js';

const inputSchema = z.object({
  transcript: z
    .string()
    .min(1)
    .describe('Hebrew meeting transcript (raw text). May come from Otter / Zoom / manual notes.'),
  customer_name: z.string().optional().describe('Customer full name in Hebrew, for context.'),
  meeting_date: z.string().optional().describe('Meeting date (ISO 8601 or Hebrew text).'),
});

export const summarizeMeetingTool = betaZodTool({
  name: 'summarize_meeting',
  description:
    'Summarize a Hebrew meeting transcript into structured sections: key_topics, decisions, action_items (with owners), open_questions, and a short Hebrew summary suitable for CRM notes.',
  inputSchema,
  run: async (input) => {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: subagentModel(),
      max_tokens: 4096,
      system:
        'You summarize Hebrew financial-planning client meetings for an Israeli advisory firm. Always produce strict JSON with these fields: {"key_topics": [string], "decisions": [string], "action_items": [{"owner": string, "due": string|null, "task": string}], "open_questions": [string], "hebrew_summary": string}. Use Hebrew for the values. Never invent figures or regulatory facts that were not stated.',
      messages: [
        {
          role: 'user',
          content: `Customer: ${input.customer_name ?? '(unknown)'}\nDate: ${input.meeting_date ?? '(unknown)'}\n\nTranscript:\n${input.transcript}`,
        },
      ],
    });

    let raw = '';
    for (const block of response.content) {
      if (block.type === 'text') raw += block.text;
    }

    // Try to extract JSON even if Claude wrapped it
    const match = raw.match(/\{[\s\S]*\}/);
    const jsonText = match ? match[0] : raw;
    try {
      const parsed: unknown = JSON.parse(jsonText);
      logger.info({ tool: 'summarize_meeting' }, 'tool.executed');
      return JSON.stringify(parsed);
    } catch {
      logger.warn({ raw }, 'summarize_meeting.parse_failed');
      // Fall back to raw text so the caller can still read something
      return JSON.stringify({
        key_topics: [],
        decisions: [],
        action_items: [],
        open_questions: [],
        hebrew_summary: raw.slice(0, 1000),
        parse_warning: 'Output was not valid JSON; raw text preserved in hebrew_summary.',
      });
    }
  },
});
