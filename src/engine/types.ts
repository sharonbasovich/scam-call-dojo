export type Speaker = 'caller' | 'user';

export type TacticCategory =
  | 'urgency'
  | 'authority'
  | 'secrecy'
  | 'payment'
  | 'harvest'
  | 'emotion';

export type UserMoveKind = 'leak' | 'comply' | 'secrecy-agree' | 'verify' | 'refuse';

export interface Rule {
  id: string;
  label: string;
  side: Speaker;
  /** Caller-side rules carry a tactic category; user-side rules carry a move kind. */
  category?: TacticCategory;
  move?: UserMoveKind;
  /** 1 = mild pressure, 2 = strong, 3 = critical (asks for money or secrets). */
  severity: 1 | 2 | 3;
  patterns: RegExp[];
  explain: string;
}

export interface Flag {
  ruleId: string;
  label: string;
  side: Speaker;
  category?: TacticCategory;
  move?: UserMoveKind;
  severity: 1 | 2 | 3;
  evidence: string;
  explain: string;
}

export interface TranscriptLine {
  /** Milliseconds since the call connected. */
  t: number;
  speaker: Speaker;
  text: string;
  flags: Flag[];
}

export interface ScenarioTurn {
  line: string;
  /** Spoken instead of `line` when the user pushed back on the previous turn. */
  pushback?: string;
  /** Spoken instead of `line` when the user complied on the previous turn. */
  exploit?: string;
}

export type Belt = 'white' | 'yellow' | 'orange' | 'green' | 'blue' | 'black';

export interface Scenario {
  id: string;
  title: string;
  belt: Belt;
  callerName: string;
  callerNumber: string;
  avatar: string;
  blurb: string;
  voice: { pitch: number; rate: number; deapiVoice: string };
  turns: ScenarioTurn[];
  /** Said when the user hangs up or refuses at the end. */
  giveUp: string;
  /** Said when the user hands over what the scammer wanted. */
  win: string;
  tell: string;
  safeScript: string;
  quickReplies: { risky: string[]; safe: string[] };
}

export type Outcome = 'declined' | 'hung-up' | 'scammed' | 'survived';

export interface Autopsy {
  scenarioId: string;
  outcome: Outcome;
  score: number;
  belt: Belt;
  durationMs: number;
  hangUpAt: number | null;
  hangUpLine: string | null;
  lingeredMs: number;
  transcript: TranscriptLine[];
  tacticCounts: Record<TacticCategory, number>;
  userMoves: Flag[];
  headline: string;
  tips: string[];
}
