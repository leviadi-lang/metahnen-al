import type Anthropic from '@anthropic-ai/sdk';
import { runSubAgent } from '../shared/base-agent.js';
import type { AgentRunResult } from '../../shared/types.js';

export const SALES_TOOLS = [
  'send_whatsapp_message',
  'send_email',
  'schedule_meeting',
  'update_crm_status',
] as const;

export async function runSalesAgent(
  userMessage: Anthropic.Beta.BetaMessageParam | string,
  history: Anthropic.Beta.BetaMessageParam[] = [],
): Promise<AgentRunResult> {
  return runSubAgent(
    {
      name: 'sales',
      promptName: 'sales',
      toolNames: SALES_TOOLS,
      effort: 'medium',
    },
    userMessage,
    history,
  );
}
