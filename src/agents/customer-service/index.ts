import type Anthropic from '@anthropic-ai/sdk';
import { runSubAgent } from '../shared/base-agent.js';
import type { AgentRunResult } from '../../shared/types.js';

export const CUSTOMER_SERVICE_TOOLS = [
  'send_whatsapp_message',
  'send_email',
  'update_crm_status',
  'schedule_meeting',
] as const;

export async function runCustomerServiceAgent(
  userMessage: Anthropic.Beta.BetaMessageParam | string,
  history: Anthropic.Beta.BetaMessageParam[] = [],
): Promise<AgentRunResult> {
  return runSubAgent(
    {
      name: 'customer_service',
      promptName: 'customer-service',
      toolNames: CUSTOMER_SERVICE_TOOLS,
      effort: 'medium',
    },
    userMessage,
    history,
  );
}
