import { describe, it, expect, beforeEach } from 'vitest';
import { loadPrompt, clearPromptCache, type PromptName } from '../src/prompts/loader.js';

describe('prompt loader', () => {
  beforeEach(() => {
    clearPromptCache();
  });

  const names: PromptName[] = ['master', 'customer-service', 'sales', 'lead-intake', 'operations'];

  it.each(names)('loads the "%s" prompt and contains Hebrew content', (name) => {
    const content = loadPrompt(name);
    expect(content.length).toBeGreaterThan(200);
    // All prompts must contain Hebrew characters
    expect(content).toMatch(/[֐-׿]/);
  });

  it('caches the prompt after first read', () => {
    const a = loadPrompt('master');
    const b = loadPrompt('master');
    expect(a).toBe(b); // same reference — cached
  });
});
