import { describe, expect, it } from 'vitest';
import { buildAutopsy, beltForScore, findHangUpPoint, formatTime, shareCard } from '../src/engine/autopsy';
import { CallSession } from '../src/engine/call';
import { detect } from '../src/engine/detector';
import { SCENARIOS, getScenario } from '../src/engine/scenarios';

function fakeClock(stepMs = 3000) {
  let t = 0;
  return () => (t += stepMs);
}

describe('scenarios', () => {
  it('ships six unique scenarios with a belt each', () => {
    expect(SCENARIOS).toHaveLength(6);
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(6);
    expect(new Set(SCENARIOS.map((s) => s.belt)).size).toBe(6);
  });
  it('uses only fictional 555-01xx numbers', () => {
    for (const s of SCENARIOS) expect(s.callerNumber).toMatch(/\(555\) 010-01\d\d/);
  });
  it('every scenario contains at least one critical tactic the detector catches', () => {
    for (const s of SCENARIOS) {
      const lines = s.turns.flatMap((t) => [t.line, t.pushback ?? '', t.exploit ?? '']);
      const critical = lines.flatMap((l) => detect(l, 'caller')).filter((f) => f.severity === 3);
      expect(critical.length, s.id).toBeGreaterThan(0);
    }
  });
  it('every risky quick reply is flagged and every safe one earns a safe move', () => {
    for (const s of SCENARIOS) {
      for (const r of s.quickReplies.risky) {
        const flags = detect(r, 'user');
        expect(flags.some((f) => f.move === 'comply' || f.move === 'leak' || f.move === 'secrecy-agree'), `${s.id}: ${r}`).toBe(true);
      }
      for (const r of s.quickReplies.safe) {
        const flags = detect(r, 'user');
        expect(flags.some((f) => f.move === 'verify' || f.move === 'refuse'), `${s.id}: ${r}`).toBe(true);
      }
    }
  });
  it('throws on unknown scenario', () => {
    expect(() => getScenario('nope')).toThrow();
  });
});

describe('call session', () => {
  it('ends as scammed when the user reads out a code, and scores low', () => {
    const call = new CallSession(getScenario('bank'), fakeClock());
    call.answer();
    call.respond('Yes, what do you need?');
    const step = call.respond('Okay, the code is 4 8 1 5 1 6');
    expect(step.ended).toBe(true);
    expect(call.outcome).toBe('scammed');
    const a = buildAutopsy(call);
    expect(a.score).toBeLessThan(45);
    expect(a.hangUpAt).not.toBeNull();
    expect(a.transcript.find((l) => l.speaker === 'user' && l.text.includes('•'))).toBeTruthy();
    expect(a.transcript.some((l) => /\d{4}/.test(l.text) && l.speaker === 'user')).toBe(false);
  });

  it('caller gives up after two safe moves and the user scores high', () => {
    const call = new CallSession(getScenario('internship'), fakeClock());
    call.answer();
    const s1 = call.respond('I’ll check with my career centre first.');
    expect(s1.ended).toBe(false);
    expect(s1.caller?.text).toContain('30 minutes');
    const s2 = call.respond('Employers don’t charge fees. This is a scam.');
    expect(s2.ended).toBe(true);
    expect(call.outcome).toBe('survived');
    expect(buildAutopsy(call).score).toBeGreaterThanOrEqual(85);
  });

  it('uses exploit branch after compliance', () => {
    const call = new CallSession(getScenario('boss'), fakeClock());
    call.answer();
    const s = call.respond('Sure, what do you need?');
    expect(s.caller?.text).toContain('gift cards');
    const s2 = call.respond('hmm');
    expect(s2.caller?.text).toContain('Keep this between us');
  });

  it('hang-up phrase ends the call without a caller reply', () => {
    const call = new CallSession(getScenario('parcel'), fakeClock());
    call.answer();
    const s = call.respond('Goodbye');
    expect(s).toEqual({ caller: null, ended: true });
    expect(call.outcome).toBe('hung-up');
    expect(buildAutopsy(call).score).toBe(100);
  });

  it('declining scores 100 with the declined outcome', () => {
    const call = new CallSession(getScenario('crypto'), fakeClock());
    call.decline();
    const a = buildAutopsy(call);
    expect(a.outcome).toBe('declined');
    expect(a.score).toBe(100);
  });

  it('lingering past the hang-up point costs points', () => {
    const call = new CallSession(getScenario('grandparent'), fakeClock());
    call.answer();
    call.respond('hmm');
    call.respond('hmm');
    call.respond('hmm');
    call.hangUp();
    const a = buildAutopsy(call);
    expect(a.outcome).toBe('hung-up');
    expect(a.score).toBeLessThan(100);
    expect(a.lingeredMs).toBeGreaterThan(0);
  });

  it('empty input is ignored and responses after the end are no-ops', () => {
    const call = new CallSession(getScenario('bank'), fakeClock());
    call.answer();
    expect(call.respond('   ')).toEqual({ caller: null, ended: false });
    call.hangUp();
    expect(call.respond('hello')).toEqual({ caller: null, ended: true });
  });

  it('timestamps are monotonic', () => {
    const call = new CallSession(getScenario('bank'), fakeClock());
    call.answer();
    call.respond('hmm');
    call.respond('hmm');
    const ts = call.transcript.map((l) => l.t);
    expect([...ts].sort((a, b) => a - b)).toEqual(ts);
  });
});

describe('autopsy helpers', () => {
  it('formats time', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(65_400)).toBe('1:05');
  });
  it('maps scores to belts', () => {
    expect(beltForScore(100)).toBe('black');
    expect(beltForScore(90)).toBe('blue');
    expect(beltForScore(10)).toBe('white');
  });
  it('finds the first critical caller line as the hang-up point', () => {
    const t = [
      { t: 0, speaker: 'caller' as const, text: 'hi', flags: [] },
      { t: 5, speaker: 'caller' as const, text: 'code', flags: detect('read me the verification code', 'caller') },
    ];
    expect(findHangUpPoint(t)?.t).toBe(5);
  });
  it('share card names the tactics and the safe script', () => {
    const s = getScenario('bank');
    const call = new CallSession(s, fakeClock());
    call.answer();
    call.respond('hmm');
    call.hangUp();
    const card = shareCard(buildAutopsy(call), s.title, s.tell, s.safeScript);
    expect(card).toContain('Info harvest');
    expect(card).toContain(s.safeScript);
  });
});
