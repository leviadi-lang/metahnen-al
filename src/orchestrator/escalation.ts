import { logger } from '../shared/logger.js';

/**
 * Hard-rule escalation triggers — these short-circuit the Master Agent
 * before any Claude call. The Master prompt also enforces these, but we keep
 * a deterministic guardrail in code as defense in depth.
 */

export interface EscalationOutcome {
  shouldEscalate: boolean;
  reason?: string;
  severity?: 'low' | 'medium' | 'high';
}

// Hebrew + English red-flag phrases. Conservative — false positives are
// preferable to false negatives in a compliance context.
const RED_FLAGS: Array<{ pattern: RegExp; severity: 'low' | 'medium' | 'high'; reason: string }> = [
  { pattern: /אני אתבע|תביעה משפטית|להתלונן לרגולטור|להגיש תלונה/, severity: 'high', reason: 'Legal threat / regulator complaint' },
  { pattern: /מה הכי כדאי לי|תגיד לי איזה מסלול|איזה השקעה הכי טובה/, severity: 'high', reason: 'Personal investment advice request' },
  { pattern: /sue|lawsuit|file a complaint|regulator/i, severity: 'high', reason: 'Legal threat (English)' },
  { pattern: /\bI demand\b|\bunacceptable\b/i, severity: 'medium', reason: 'Aggressive escalation language' },
  { pattern: /אני כועס|זה לא יעלה על הדעת|לא מקובל עליי/, severity: 'medium', reason: 'Customer expressing anger' },
];

export function checkHardEscalationRules(text: string | undefined): EscalationOutcome {
  if (!text) return { shouldEscalate: false };
  for (const flag of RED_FLAGS) {
    if (flag.pattern.test(text)) {
      logger.warn({ reason: flag.reason, severity: flag.severity }, 'escalation.hard_rule_match');
      return { shouldEscalate: true, reason: flag.reason, severity: flag.severity };
    }
  }
  return { shouldEscalate: false };
}
