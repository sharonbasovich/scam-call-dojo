import type { CallSession } from './call';
import type { Autopsy, Belt, Flag, TacticCategory, TranscriptLine } from './types';

export const CATEGORY_LABELS: Record<TacticCategory, string> = {
  urgency: 'Urgency',
  authority: 'Authority',
  secrecy: 'Secrecy',
  payment: 'Payment rails',
  harvest: 'Info harvest',
  emotion: 'Emotion',
};

const MOVE_POINTS: Record<string, number> = {
  'leak-digits': -40,
  'leak-identity': -25,
  'agree-pay': -35,
  'agree-secret': -15,
  comply: -8,
  verify: 5,
  refuse: 3,
};

/** Red-flag budget: the caller line where cumulative pressure crosses this (or any critical tactic appears) is the hang-up point. */
export const HANG_UP_THRESHOLD = 4;
const LINGER_PENALTY_PER_LINE = 6;

export function findHangUpPoint(transcript: TranscriptLine[]): TranscriptLine | null {
  let pressure = 0;
  for (const line of transcript) {
    if (line.speaker !== 'caller') continue;
    for (const f of line.flags) {
      pressure += f.severity;
      if (f.severity === 3 || pressure >= HANG_UP_THRESHOLD) return line;
    }
  }
  return null;
}

export function beltForScore(score: number): Belt {
  if (score >= 95) return 'black';
  if (score >= 85) return 'blue';
  if (score >= 75) return 'green';
  if (score >= 60) return 'orange';
  if (score >= 40) return 'yellow';
  return 'white';
}

export function formatTime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function buildAutopsy(call: CallSession): Autopsy {
  const { transcript, scenario } = call;
  const outcome = call.outcome ?? 'hung-up';
  const durationMs = call.durationMs;

  const tacticCounts: Record<TacticCategory, number> = { urgency: 0, authority: 0, secrecy: 0, payment: 0, harvest: 0, emotion: 0 };
  for (const line of transcript) {
    if (line.speaker !== 'caller') continue;
    for (const f of line.flags) if (f.category) tacticCounts[f.category] += 1;
  }
  const userMoves: Flag[] = transcript.filter((l) => l.speaker === 'user').flatMap((l) => l.flags);

  const hangUp = findHangUpPoint(transcript);
  const hangUpIdx = hangUp ? transcript.indexOf(hangUp) : -1;
  const callerLinesAfter = hangUpIdx < 0 ? 0 : transcript.slice(hangUpIdx + 1).filter((l) => l.speaker === 'caller').length;
  const lingeredMs = hangUp ? Math.max(0, durationMs - hangUp.t) : 0;

  let score = 100;
  if (outcome !== 'declined') {
    for (const m of userMoves) score += MOVE_POINTS[m.ruleId] ?? 0;
    score -= callerLinesAfter * LINGER_PENALTY_PER_LINE;
    if (outcome === 'scammed') score = Math.min(score, 45);
    if (outcome === 'survived') score -= 5;
  }
  score = Math.max(0, Math.min(100, Math.round(score)));

  const headline = {
    declined: 'You declined an unknown caller. Honestly? Elite move. Now answer one to train.',
    'hung-up': callerLinesAfter <= 1 ? 'Clean hang-up. The scammer never got a foothold.' : 'You hung up, but only after the scammer got several shots in.',
    scammed: 'You got scammed. Safely, this time.',
    survived: 'You held the line and the scammer gave up. Hanging up sooner is even better.',
  }[outcome];

  const seen = new Set<string>();
  const tips: string[] = [];
  for (const line of transcript) {
    for (const f of line.flags) {
      if (f.side !== 'caller' || seen.has(f.ruleId)) continue;
      seen.add(f.ruleId);
      tips.push(`${f.label}: ${f.explain}`);
    }
  }

  return {
    scenarioId: scenario.id,
    outcome,
    score,
    belt: beltForScore(score),
    durationMs,
    hangUpAt: hangUp ? hangUp.t : null,
    hangUpLine: hangUp ? hangUp.text : null,
    lingeredMs,
    transcript,
    tacticCounts,
    userMoves,
    headline,
    tips,
  };
}

export function shareCard(a: Autopsy, scenarioTitle: string, tell: string, safeScript: string): string {
  const tactics = (Object.keys(a.tacticCounts) as TacticCategory[])
    .filter((k) => a.tacticCounts[k] > 0)
    .map((k) => CATEGORY_LABELS[k])
    .join(', ');
  return [
    `I practised a fake scam call on Scam Call Dojo: “${scenarioTitle}”.`,
    `Tactics used on me: ${tactics || 'none spotted'}.`,
    `The tell: ${tell}`,
    `What to say: ${safeScript}`,
    'If anyone calls you like this, hang up and call back on a number you already trust.',
  ].join('\n');
}
