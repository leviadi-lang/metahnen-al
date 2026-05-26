import type Anthropic from '@anthropic-ai/sdk';
import { runSubAgent } from '../shared/base-agent.js';
import type { AgentRunResult } from '../../shared/types.js';

export const OPERATIONS_TOOLS = [
  'classify_document',
  'update_crm_status',
  'send_email',
  'summarize_meeting',
] as const;

export async function runOperationsAgent(
  userMessage: Anthropic.Beta.BetaMessageParam | string,
  history: Anthropic.Beta.BetaMessageParam[] = [],
): Promise<AgentRunResult> {
  return runSubAgent(
    {
      name: 'operations',
      promptName: 'operations',
      toolNames: OPERATIONS_TOOLS,
      // Operations work prioritizes accuracy over latency
      effort: 'high',
      thinking: true,
    },
    userMessage,
    history,
  );
}
