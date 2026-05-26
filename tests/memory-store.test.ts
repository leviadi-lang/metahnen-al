import { describe, it, expect, beforeEach } from 'vitest';
import { getMemoryStore, resetMemoryStore } from '../src/memory/store.js';

describe('memory store', () => {
  beforeEach(() => {
    resetMemoryStore();
  });

  it('stores and retrieves conversation state', async () => {
    const store = getMemoryStore();
    await store.set('cust_001', {
      customer_id: 'cust_001',
      notes: ['First contact'],
      last_updated_at: new Date().toISOString(),
    });
    const retrieved = await store.get('cust_001');
    expect(retrieved?.customer_id).toBe('cust_001');
    expect(retrieved?.notes).toEqual(['First contact']);
  });

  it('returns null for missing keys', async () => {
    const store = getMemoryStore();
    const value = await store.get('does_not_exist');
    expect(value).toBeNull();
  });

  it('merge overrides previous values and stamps last_updated_at', async () => {
    const store = getMemoryStore();
    await store.set('cust_002', {
      notes: ['initial'],
      last_updated_at: '2026-01-01T00:00:00Z',
    });
    const merged = await store.merge('cust_002', {
      last_agent: 'customer_service',
      notes: ['Updated note'],
    });
    expect(merged.last_agent).toBe('customer_service');
    expect(merged.notes).toEqual(['Updated note']);
    expect(merged.last_updated_at).not.toBe('2026-01-01T00:00:00Z');
  });

  it('returns deep copies — mutating result does not affect store', async () => {
    const store = getMemoryStore();
    await store.set('cust_003', {
      notes: ['original'],
      last_updated_at: new Date().toISOString(),
    });
    const a = await store.get('cust_003');
    a!.notes.push('mutated');
    const b = await store.get('cust_003');
    expect(b!.notes).toEqual(['original']);
  });

  it('delete removes the entry', async () => {
    const store = getMemoryStore();
    await store.set('temp', { notes: [], last_updated_at: new Date().toISOString() });
    await store.delete('temp');
    expect(await store.get('temp')).toBeNull();
  });
});
