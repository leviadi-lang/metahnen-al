import type Anthropic from '@anthropic-ai/sdk';
import { runSubAgent } from '../shared/base-agent.js';
import type { AgentRunResult } from '../../shared/types.js';

export const LEAD_INTAKE_TOOLS = [
  'create_crm_process',
  'send_whatsapp_message',
  'send_email',
  'create_followup_task',
] as const;

export async function runLeadIntakeAgent(
  userMessage: Anthropic.Beta.BetaMessageParam | string,
  history: Anthropic.Beta.BetaMessageParam[] = [],
): Promise<AgentRunResult> {
  return runSubAgent(
    {
      name: 'lead_intake',
      promptName: 'lead-intake',
      toolNames: LEAD_INTAKE_TOOLS,
      effort: 'medium',
    },
    userMessage,
    history,
  );
}
