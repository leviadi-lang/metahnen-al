/** Shared types used across the runtime. */

export type AgentName = 'master' | 'customer_service' | 'sales' | 'lead_intake' | 'operations';

export type RoutingDecision =
  | { type: 'agent'; agent: Exclude<AgentName, 'master'>; reasoning: string }
  | { type: 'escalate'; reasoning: string; severity: 'low' | 'medium' | 'high' };

export interface InboundEvent {
  /** Unique event ID — Make.com webhook ID or generated. */
  event_id: string;
  /** Channel the event came from. */
  channel: 'whatsapp' | 'email' | 'webhook' | 'internal';
  /** Customer / lead identifier if known. */
  customer_id?: string;
  /** Raw Hebrew message text or structured payload. */
  text?: string;
  /** Arbitrary structured payload from the source. */
  payload?: Record<string, unknown>;
  /** ISO timestamp. */
  received_at: string;
}

export interface AgentRunResult {
  agent: AgentName;
  /** Final Hebrew message the agent produced (for customer-facing flows). */
  output_text?: string;
  /** Tools the agent invoked, in order. */
  tool_calls: Array<{ name: string; input: unknown; output: unknown }>;
  /** Reason the agent stopped (end_turn, escalation, error). */
  stop_reason: 'end_turn' | 'escalated' | 'error' | 'max_turns';
  /** Optional human-readable summary in English for logs. */
  summary?: string;
}
