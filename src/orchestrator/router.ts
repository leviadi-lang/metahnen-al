import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod/v4';
import { getAnthropicClient, masterModel } from '../shared/claude-client.js';
import { loadPrompt } from '../prompts/loader.js';
import { logger } from '../shared/logger.js';
import type { RoutingDecision } from '../shared/types.js';

/**
 * The Master Agent uses a single tool — `route_to_agent` — to commit its
 * routing decision. We collect the call via the tool runner and stop after
 * the first invocation.
 */

const routeInputSchema = z.object({
  target: z
    .enum(['customer_service', 'sales', 'lead_intake', 'operations', 'escalate_to_human'])
    .describe('Where the inbound event should be handled.'),
  reasoning: z.string().min(1).describe('English explanation of why this target was chosen.'),
  severity: z
    .enum(['low', 'medium', 'high'])
    .optional()
    .describe('Required when target is escalate_to_human.'),
  customer_id: z.string().optional().describe('Customer ID if known.'),
  intent_summary: z
    .string()
    .optional()
    .describe('One-sentence Hebrew summary of the customer intent.'),
});

interface CapturedRoute {
  value?: z.infer<typeof routeInputSchema>;
}

function buildRouteTool(captured: CapturedRoute) {
  return betaZodTool({
    name: 'route_to_agent',
    description:
      'Commit the routing decision for this inbound event. Call this exactly once when you have decided where the event should go.',
    inputSchema: routeInputSchema,
    run: async (input) => {
      captured.value = input;
      // Return an empty acknowledgement — the Master should end its turn after this.
      return JSON.stringify({ ok: true });
    },
  });
}

export async function routeWithMaster(inboundText: string, contextSnippet?: string): Promise<RoutingDecision> {
  const client = getAnthropicClient();
  const captured: CapturedRoute = {};

  const userBlock = contextSnippet
    ? `Context:\n${contextSnippet}\n\nInbound:\n${inboundText}`
    : inboundText;

  await client.beta.messages.toolRunner({
    model: masterModel(),
    max_tokens: 2048,
    system: loadPrompt('master'),
    tools: [buildRouteTool(captured)],
    messages: [{ role: 'user', content: userBlock }],
    // Force the master to use the routing tool.
    tool_choice: { type: 'tool', name: 'route_to_agent' },
  });

  if (!captured.value) {
    logger.warn({ inboundText }, 'router.no_decision');
    return {
      type: 'escalate',
      reasoning: 'Master agent failed to emit a routing decision',
      severity: 'medium',
    };
  }

  const { target, reasoning, severity } = captured.value;
  logger.info({ target, reasoning }, 'router.decided');

  if (target === 'escalate_to_human') {
    return {
      type: 'escalate',
      reasoning,
      severity: severity ?? 'medium',
    };
  }

  return { type: 'agent', agent: target, reasoning };
}
