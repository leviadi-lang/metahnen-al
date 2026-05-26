import type Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient, subagentModel } from '../../shared/claude-client.js';
import { logger } from '../../shared/logger.js';
import { loadPrompt, type PromptName } from '../../prompts/loader.js';
import { ALL_TOOLS, type ToolName, toolsByName } from '../../tools/registry.js';
import type { AgentName, AgentRunResult } from '../../shared/types.js';

export interface SubAgentConfig {
  /** Internal name for this sub-agent. */
  name: Exclude<AgentName, 'master'>;
  /** Which prompt file to load from src/prompts/. */
  promptName: PromptName;
  /** Which subset of the 7 shared tools this agent may invoke. */
  toolNames: readonly ToolName[];
  /** Override the default sub-agent model if needed. */
  model?: string;
  /** Max tokens for non-streaming runs. */
  maxTokens?: number;
  /** Anthropic `effort` setting — low | medium | high | max. */
  effort?: 'low' | 'medium' | 'high' | 'max';
  /** Enable adaptive thinking. Defaults to false (latency-sensitive replies). */
  thinking?: boolean;
}

/**
 * Generic sub-agent runner. Loads the agent's system prompt, scopes tools, and
 * runs the SDK's tool runner loop until the model emits `end_turn`.
 *
 * For Opus 4.7 / Sonnet 4.6:
 *   - No temperature / top_p / top_k (would 400 on Opus 4.7)
 *   - thinking uses {type: "adaptive"} when enabled
 *   - effort goes inside output_config
 */
export async function runSubAgent(
  config: SubAgentConfig,
  userMessage: Anthropic.Beta.BetaMessageParam | string,
  history: Anthropic.Beta.BetaMessageParam[] = [],
): Promise<AgentRunResult> {
  const client = getAnthropicClient();
  const system = loadPrompt(config.promptName);
  const tools =
    config.toolNames.length > 0 ? toolsByName(config.toolNames) : ALL_TOOLS;

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...history,
    typeof userMessage === 'string'
      ? { role: 'user', content: userMessage }
      : userMessage,
  ];

  const toolCalls: AgentRunResult['tool_calls'] = [];

  logger.info(
    { agent: config.name, model: config.model ?? subagentModel(), toolCount: tools.length },
    'agent.run.start',
  );

  const finalMessage = await client.beta.messages.toolRunner({
    model: config.model ?? subagentModel(),
    max_tokens: config.maxTokens ?? 16000,
    system,
    tools,
    messages,
    ...(config.thinking && { thinking: { type: 'adaptive' } }),
    ...(config.effort && {
      output_config: { effort: config.effort },
    }),
  });

  // The tool runner doesn't expose intermediate tool calls directly — we re-walk
  // the content blocks of the final message and any tool_use blocks recorded.
  for (const block of finalMessage.content) {
    if (block.type === 'tool_use') {
      toolCalls.push({ name: block.name, input: block.input, output: null });
    }
  }

  let outputText = '';
  for (const block of finalMessage.content) {
    if (block.type === 'text') outputText += block.text;
  }

  const stopReason: AgentRunResult['stop_reason'] =
    finalMessage.stop_reason === 'end_turn'
      ? 'end_turn'
      : finalMessage.stop_reason === 'max_tokens'
        ? 'max_turns'
        : 'end_turn';

  logger.info(
    {
      agent: config.name,
      stopReason,
      outputLength: outputText.length,
      toolCalls: toolCalls.length,
    },
    'agent.run.complete',
  );

  return {
    agent: config.name,
    output_text: outputText,
    tool_calls: toolCalls,
    stop_reason: stopReason,
  };
}
