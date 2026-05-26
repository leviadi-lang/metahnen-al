/** Short-term context state per customer / conversation. */

export interface ConversationState {
  customer_id?: string;
  /** Free-form context the agent should remember within the conversation. */
  notes: string[];
  /** Stage of the customer's currently-open process. */
  process_stage?: string;
  /** Last agent that handled this customer. */
  last_agent?: string;
  /** Last touched timestamp (ISO 8601). */
  last_updated_at: string;
  /** Outstanding documents to chase. */
  missing_documents?: string[];
}
