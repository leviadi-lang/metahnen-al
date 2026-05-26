import { describe, it, expect } from 'vitest';
import { checkHardEscalationRules } from '../../src/orchestrator/escalation.js';

describe('checkHardEscalationRules', () => {
  it('escalates on Hebrew legal threats', () => {
    const r = checkHardEscalationRules('זה לא יקרה ככה. אני אתבע אתכם!');
    expect(r.shouldEscalate).toBe(true);
    expect(r.severity).toBe('high');
  });

  it('escalates on Hebrew personal advice requests', () => {
    const r = checkHardEscalationRules('היי, מה הכי כדאי לי לעשות עם הפיצויים?');
    expect(r.shouldEscalate).toBe(true);
    expect(r.severity).toBe('high');
  });

  it('escalates on regulator complaint threat (English)', () => {
    const r = checkHardEscalationRules('I will file a complaint with the regulator');
    expect(r.shouldEscalate).toBe(true);
  });

  it('escalates on Hebrew anger', () => {
    const r = checkHardEscalationRules('אני כועס מאוד על השירות הזה');
    expect(r.shouldEscalate).toBe(true);
    expect(r.severity).toBe('medium');
  });

  it('does NOT escalate on a normal status question', () => {
    const r = checkHardEscalationRules('היי, רציתי לבדוק את הסטטוס של התיק שלי');
    expect(r.shouldEscalate).toBe(false);
  });

  it('handles empty / undefined input safely', () => {
    expect(checkHardEscalationRules(undefined).shouldEscalate).toBe(false);
    expect(checkHardEscalationRules('').shouldEscalate).toBe(false);
  });
});
