import { RULES } from './rules';
import type { Flag, Rule, Speaker } from './types';

function firstMatch(rule: Rule, text: string): { evidence: string; index: number } | null {
  for (const re of rule.patterns) {
    const m = re.exec(text);
    if (m) return { evidence: m[0].trim(), index: m.index };
  }
  return null;
}

const CLAUSE_BOUNDARY = /[.!?;,—–]|\b(?:so|but|however|though|yet)\b/g;
const NEGATOR = /\b(don'?t|do not|won'?t|will not|can'?t|cannot|couldn'?t|didn'?t|doesn'?t|ain'?t|never|not|no need(?: to)?)\b/i;
/**
 * The verification channel belongs to the caller when the utterance asks the
 * caller to provide it, references details the caller supplied, or routes the
 * check back through the caller's own side ("ask your manager").
 */
const CALLER_CHANNEL =
  /\b(send|sent|give|gave|tell|told|text(?:ed)?|e-?mail(?:ed)?|forward(?:ed)?) (me|us)\b|\bwhat('?s| is| was| are) your\b|\b(?:number|phone|extension|e-?mail|link|web ?site|code|details?) (?:you|u|the caller|he|she|they|that (?:you|he|she|they)) (?:gave|sent|send|said|provided|text(?:ed)?|told|shared|called)\b|\b(?:you|u|the caller|he|she|they) (?:gave|sent|send|provided|text(?:ed)?|shared|called)\b|\b(?:with|from|ask|asking|speak (?:to|with)|talk (?:to|with)|check with) (?:you|the caller)\b|\bcall(?:ing)? (?:you|them|him|her) back\b(?! on\b)|\byour (?:manager|supervisor|boss)\b|\b(?:who|that) (?:called|rang|phoned)(?: me| us)?\b/i;
/** Reported or second-hand instructions are not actions the user took. */
const REPORTED = /\b(?:he|she|they|the caller|the (?:agent|guy|woman|man|officer|person|script)|you) (?:said|says|told|asked|claimed|instructed|insisted|advised|wants?(?: me| us)? to)\b/i;
const SAFE_MOVES = new Set(['verify', 'refuse']);

function clauseAround(text: string, index: number): { before: string; whole: string } {
  CLAUSE_BOUNDARY.lastIndex = 0;
  let start = 0;
  let end = text.length;
  let m: RegExpExecArray | null;
  while ((m = CLAUSE_BOUNDARY.exec(text)) !== null) {
    if (m.index < index) start = m.index + m[0].length;
    else {
      end = m.index;
      break;
    }
  }
  return { before: text.slice(start, index), whole: text.slice(start, end) };
}

/**
 * Heuristic guard: a safe-looking phrase doesn't count when the user negated it
 * in the same clause ("I can't call the bank"), is quoting or reporting someone
 * else ('he said "call the number on your card"', "the script says hang up"),
 * or the "trusted source" is really the caller's own channel ("check with you",
 * "the number you gave me"). Clause scope keeps earlier independent negations
 * from blocking a genuine safe move ("I never share codes so let me call my
 * bank"). Regex can't prove intent — this removes obvious false positives.
 */
function disqualified(text: string, matchIndex: number): boolean {
  const before = text.slice(0, matchIndex);
  if ((before.match(/"/g) ?? []).length % 2 === 1) return true;
  const clause = clauseAround(text, matchIndex);
  return NEGATOR.test(clause.before) || CALLER_CHANNEL.test(clause.whole) || REPORTED.test(clause.whole);
}

export function normalize(text: string): string {
  return text.replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"');
}

/** Deterministically flags tactics (caller) or risky/safe moves (user) in one utterance. */
export function detect(raw: string, side: Speaker, rules: Rule[] = RULES): Flag[] {
  const text = normalize(raw);
  const flags: Flag[] = [];
  for (const rule of rules) {
    if (rule.side !== side) continue;
    const match = firstMatch(rule, text);
    if (match === null) continue;
    if (rule.move && SAFE_MOVES.has(rule.move) && disqualified(text, match.index)) continue;
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

const HANG_WORDS = /\b(?:hang(?:ing)? up|goodbye|bye|i('?m| am) (?:done|going now))\b/gi;

/** True when the user signals they are ending the call; negated or reported mentions don't count. */
export function isHangUpIntent(raw: string): boolean {
  const text = normalize(raw);
  HANG_WORDS.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = HANG_WORDS.exec(text)) !== null) {
    if (!disqualified(text, m.index)) return true;
  }
  return false;
}
