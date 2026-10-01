import { RULES } from './rules';
import type { Flag, Rule, Speaker } from './types';

function firstMatch(rule: Rule, text: string): { evidence: string; index: number } | null {
  for (const re of rule.patterns) {
    const m = re.exec(text);
    if (m) return { evidence: m[0].trim(), index: m.index };
  }
  return null;
}

const CLAUSE_BOUNDARY = /[.!?;,]/;
const NEGATOR = /\b(don'?t|do not|won'?t|will not|can'?t|cannot|couldn'?t|didn'?t|doesn'?t|ain'?t|never|not|no need(?: to)?)\b/i;
const SAFE_MOVES = new Set(['verify', 'refuse']);

/**
 * Heuristic guard: a safe-looking phrase doesn't count when the user negated it
 * in the same clause ("I can't call the bank") or is quoting someone else
 * ('he said "call the number on your card"'). Regex can't prove intent, so this
 * only removes obvious false positives rather than reasoning about language.
 */
function negatedOrQuoted(text: string, matchIndex: number): boolean {
  const before = text.slice(0, matchIndex);
  if ((before.match(/"/g) ?? []).length % 2 === 1) return true;
  const clause = before.split(CLAUSE_BOUNDARY).pop() ?? '';
  return NEGATOR.test(clause);
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
    const match = firstMatch(rule, text);
    if (match === null) continue;
    if (rule.move && SAFE_MOVES.has(rule.move) && negatedOrQuoted(text, match.index)) continue;
    flags.push({
      ruleId: rule.id,
      label: rule.label,
      side: rule.side,
      category: rule.category,
      move: rule.move,
      severity: rule.severity,
      evidence: match.evidence,
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
  return /\b(hang(ing)? up|goodbye|bye|i('?m| am) (done|going now)|click)\b/i.test(text) && !/\b(won'?t|don'?t|not) hang up\b/i.test(text);
}
