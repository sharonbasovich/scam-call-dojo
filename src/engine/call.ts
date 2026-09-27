import { detect, isHangUpIntent, redact } from './detector';
import type { Outcome, Scenario, TranscriptLine } from './types';

export type Clock = () => number;

export interface CallStep {
  caller: TranscriptLine | null;
  ended: boolean;
}

const SAFE_MOVES_TO_WIN = 2;

export class CallSession {
  readonly scenario: Scenario;
  readonly transcript: TranscriptLine[] = [];
  outcome: Outcome | null = null;
  private readonly clock: Clock;
  private connectedAt: number | null = null;
  private endedAt: number | null = null;
  private turnIndex = 0;
  private safeMoves = 0;

  constructor(scenario: Scenario, clock: Clock = () => performance.now()) {
    this.scenario = scenario;
    this.clock = clock;
  }

  get ended(): boolean {
    return this.outcome !== null;
  }

  get durationMs(): number {
    if (this.connectedAt === null) return 0;
    return (this.endedAt ?? this.clock()) - this.connectedAt;
  }

  elapsed(): number {
    return this.connectedAt === null ? 0 : this.clock() - this.connectedAt;
  }

  answer(): TranscriptLine {
    if (this.connectedAt !== null) throw new Error('Call already answered');
    this.connectedAt = this.clock();
    return this.say(this.scenario.turns[0].line);
  }

  decline(): void {
    if (this.connectedAt !== null) throw new Error('Call already answered');
    this.connectedAt = this.clock();
    this.finish('declined');
  }

  hangUp(): void {
    if (this.ended) return;
    if (this.connectedAt === null) return this.decline();
    this.finish('hung-up');
  }

  respond(raw: string): CallStep {
    if (this.connectedAt === null) throw new Error('Answer the call first');
    if (this.ended) return { caller: null, ended: true };
    const text = raw.trim();
    if (!text) return { caller: null, ended: false };

    const flags = detect(text, 'user');
    this.transcript.push({ t: this.elapsed(), speaker: 'user', text: redact(text), flags });

    const gaveItAway = flags.some((f) => f.move === 'leak' && f.severity === 3) || flags.some((f) => f.ruleId === 'agree-pay');
    if (gaveItAway) {
      const caller = this.say(this.scenario.win);
      this.finish('scammed');
      return { caller, ended: true };
    }

    if (isHangUpIntent(text)) {
      this.finish('hung-up');
      return { caller: null, ended: true };
    }

    const safe = flags.some((f) => f.move === 'refuse' || f.move === 'verify');
    const complied = flags.some((f) => f.move === 'comply' || f.move === 'leak' || f.move === 'secrecy-agree');
    if (safe && !complied) this.safeMoves += 1;

    if (this.safeMoves >= SAFE_MOVES_TO_WIN) {
      const caller = this.say(this.scenario.giveUp);
      this.finish('survived');
      return { caller, ended: true };
    }

    this.turnIndex += 1;
    const turn = this.scenario.turns[this.turnIndex];
    if (!turn) {
      const caller = this.say(this.scenario.giveUp);
      this.finish('survived');
      return { caller, ended: true };
    }
    const line = safe && turn.pushback ? turn.pushback : complied && turn.exploit ? turn.exploit : turn.line;
    return { caller: this.say(line), ended: false };
  }

  private say(text: string): TranscriptLine {
    const line: TranscriptLine = { t: this.elapsed(), speaker: 'caller', text, flags: detect(text, 'caller') };
    this.transcript.push(line);
    return line;
  }

  private finish(outcome: Outcome): void {
    this.outcome = outcome;
    this.endedAt = this.clock();
  }
}
