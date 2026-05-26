import Anthropic from '@anthropic-ai/sdk';
import { loadEnv } from '../config/env.js';

let cached: Anthropic | undefined;

/**
 * Lazy-initialized Anthropic client.
 * Reads ANTHROPIC_API_KEY from the env loader (validated by zod).
 */
export function getAnthropicClient(): Anthropic {
  if (cached) return cached;
  const env = loadEnv();
  cached = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return cached;
}

/** For tests — reset the cached client. */
export function resetAnthropicClient(): void {
  cached = undefined;
}

/**
 * Model selection helpers — read from env so tests can override.
 *
 * Per CLAUDE.md:
 *   - Master:  claude-opus-4-7   (most capable, full routing context)
 *   - Sub-agents: claude-sonnet-4-6 (cost/quality balance)
 *   - Document classifier: claude-haiku-4-5 (cheap, fast)
 */
export function masterModel(): string {
  return loadEnv().ANTHROPIC_MODEL_MASTER;
}

export function subagentModel(): string {
  return loadEnv().ANTHROPIC_MODEL_SUBAGENT;
}

export function classifierModel(): string {
  return loadEnv().ANTHROPIC_MODEL_CLASSIFIER;
}
