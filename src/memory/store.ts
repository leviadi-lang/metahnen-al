import type { ConversationState } from './types.js';

/**
 * Short-term conversation state, keyed by customer_id (or by event_id if no
 * customer_id is known yet).
 *
 * The interface is shaped to allow a Redis-backed implementation later — every
 * read returns a fresh copy.
 */
export interface MemoryStore {
  get(key: string): Promise<ConversationState | null>;
  set(key: string, state: ConversationState): Promise<void>;
  merge(key: string, partial: Partial<ConversationState>): Promise<ConversationState>;
  delete(key: string): Promise<void>;
}

class InMemoryStore implements MemoryStore {
  private readonly map = new Map<string, ConversationState>();

  async get(key: string): Promise<ConversationState | null> {
    const value = this.map.get(key);
    return value ? structuredClone(value) : null;
  }

  async set(key: string, state: ConversationState): Promise<void> {
    this.map.set(key, structuredClone(state));
  }

  async merge(key: string, partial: Partial<ConversationState>): Promise<ConversationState> {
    const existing = this.map.get(key);
    const merged: ConversationState = {
      ...(existing ?? { notes: [], last_updated_at: new Date().toISOString() }),
      ...partial,
      last_updated_at: new Date().toISOString(),
    };
    this.map.set(key, merged);
    return structuredClone(merged);
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }
}

let cached: MemoryStore | undefined;
export function getMemoryStore(): MemoryStore {
  if (!cached) cached = new InMemoryStore();
  return cached;
}
export function resetMemoryStore(): void {
  cached = undefined;
}
