import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export type PromptName =
  | 'master'
  | 'customer-service'
  | 'sales'
  | 'lead-intake'
  | 'operations';

const cache = new Map<PromptName, string>();

/**
 * Load a system prompt from the `src/prompts/<name>.md` file.
 * The Markdown content is read verbatim and cached after first load.
 */
export function loadPrompt(name: PromptName): string {
  const cached = cache.get(name);
  if (cached) return cached;

  const path = resolve(__dirname, `${name}.md`);
  const content = readFileSync(path, 'utf-8');
  cache.set(name, content);
  return content;
}

/** For tests — clear the cache so reloads can happen. */
export function clearPromptCache(): void {
  cache.clear();
}
