import { runCustomerServiceAgent } from '../agents/customer-service/index.js';
import { runSalesAgent } from '../agents/sales/index.js';
import { runLeadIntakeAgent } from '../agents/lead-intake/index.js';
import { runOperationsAgent } from '../agents/operations/index.js';
import { logger } from '../shared/logger.js';
import { getMemoryStore } from '../memory/store.js';
import type { AgentRunResult, InboundEvent, RoutingDecision } from '../shared/types.js';
import { checkHardEscalationRules } from './escalation.js';
import { routeWithMaster } from './router.js';

export interface OrchestrationResult {
  routing: RoutingDecision;
  agent_result?: AgentRunResult;
  escalated?: { reason: string; severity: 'low' | 'medium' | 'high' };
}

/**
 * The Master Orchestrator entry point. Pipeline:
 *
 *  1. Apply hard-rule escalation (Hebrew + English red-flag phrases).
 *  2. Call Master Agent (Claude Opus) with `route_to_agent` tool.
 *  3. Dispatch to the chosen sub-agent OR raise an escalation outcome.
 *  4. Persist short conversation state to memory.
 */
export async function handleInboundEvent(event: InboundEvent): Promise<OrchestrationResult> {
  logger.info({ eventId: event.event_id, channel: event.channel }, 'orchestrator.received');

  // 1. Hard rules
  const hard = checkHardEscalationRules(event.text);
  if (hard.shouldEscalate) {
    const result: OrchestrationResult = {
      routing: { type: 'escalate', reasoning: hard.reason ?? 'hard_rule', severity: hard.severity ?? 'medium' },
      escalated: { reason: hard.reason ?? 'hard_rule', severity: hard.severity ?? 'medium' },
    };
    return result;
  }

  // 2. Master decides routing
  const memoryKey = event.customer_id ?? event.event_id;
  const memory = getMemoryStore();
  const existing = await memory.get(memoryKey);
  const contextSnippet = existing
    ? `Customer ID: ${existing.customer_id ?? 'unknown'}\nLast agent: ${existing.last_agent ?? 'none'}\nNotes: ${existing.notes.join(' | ')}`
    : undefined;

  const routing = await routeWithMaster(
    event.text ?? JSON.stringify(event.payload ?? {}),
    contextSnippet,
  );

  // 3. Dispatch
  if (routing.type === 'escalate') {
    return {
      routing,
      escalated: { reason: routing.reasoning, severity: routing.severity },
    };
  }

  const userInput = event.text ?? JSON.stringify(event.payload ?? {});
  let agentResult: AgentRunResult;
  switch (routing.agent) {
    case 'customer_service':
      agentResult = await runCustomerServiceAgent(userInput);
      break;
    case 'sales':
      agentResult = await runSalesAgent(userInput);
      break;
    case 'lead_intake':
      agentResult = await runLeadIntakeAgent(userInput);
      break;
    case 'operations':
      agentResult = await runOperationsAgent(userInput);
      break;
  }

  // 4. Persist memory
  await memory.merge(memoryKey, {
    customer_id: event.customer_id,
    last_agent: routing.agent,
    notes: [`[${new Date().toISOString()}] ${routing.reasoning}`],
    last_updated_at: new Date().toISOString(),
  });

  return { routing, agent_result: agentResult };
}
