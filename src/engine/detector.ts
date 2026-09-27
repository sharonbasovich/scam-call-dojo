import { RULES } from './rules';
import type { Flag, Rule, Speaker } from './types';

function firstMatch(rule: Rule, text: string): string | null {
  for (const re of rule.patterns) {
    const m = re.exec(text);
    if (m) return m[0].trim();
  }
  return null;
}

export function normalize(text: string): string {
  return text.replace(/[\u2018\u2019\u02BC]/g, "'").replace(/[\u201C\u201D]/g, '"');
}

/** Deterministically flags tactics (caller) or risky/safe moves (user) in one utterance. */
export function detect(raw: string, side: Speaker, rules: Rule[] = RULES): Flag[] {
  const text = normalize(raw);
  const flags: Flag[] = [];
  for (const rule of rules) {
    if (rule.side !== side) continue;
    const evidence = firstMatch(rule, text);
    if (evidence === null) continue;
    flags.push({
      ruleId: rule.id,
      label: rule.label,
      side: rule.side,
      category: rule.category,
      move: rule.move,
      severity: rule.severity,
      evidence,
      explain: rule.explain,
    });
  }
  return side === 'user' ? resolveUserConflicts(flags) : flags;
}

function resolveUserConflicts(flags: Flag[]): Flag[] {
  const has = (id: string) => flags.some((f) => f.ruleId === id);
  const risky = flags.some((f) => f.move === 'leak' || f.ruleId === 'agree-pay' || f.move === 'secrecy-agree');
  return flags.filter((f) => {
    if (f.ruleId === 'refuse' && risky) return false;
    if (f.ruleId === 'comply' && (has('refuse') || has('verify'))) return false;
    return true;
  });
}

const DIGIT_RUN = /(?:\d[\s-]?){4,}/g;

/** Masks long digit runs so nothing that looks like a real code is ever displayed back. */
export function redact(text: string): string {
  return text.replace(DIGIT_RUN, (m) => m.replace(/\d/g, '•'));
}

export function isHangUpIntent(raw: string): boolean {
  const text = normalize(raw);
  return /\b(hang(ing)? up|goodbye|bye|i('?m| am) (done|going)|click)\b/i.test(text) && !/\b(won'?t|don'?t|not) hang up\b/i.test(text);
}
