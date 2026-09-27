import { describe, expect, it } from 'vitest';
import { detect, isHangUpIntent, redact } from '../src/engine/detector';
import { RULES } from '../src/engine/rules';

const ids = (text: string, side: 'caller' | 'user') => detect(text, side).map((f) => f.ruleId);

describe('caller tactic detection', () => {
  it('flags OTP requests and urgency', () => {
    const r = ids('We just sent a six-digit verification code. Read it within 10 minutes.', 'caller');
    expect(r).toContain('otp');
    expect(r).toContain('deadline');
  });
  it('flags gift cards, secrecy and authority', () => {
    const r = ids('This is the fraud department. Keep this between us and buy gift cards.', 'caller');
    expect(r).toEqual(expect.arrayContaining(['impersonate-org', 'secrecy', 'gift-card']));
  });
  it('flags upfront fees and crypto', () => {
    expect(ids('There is a one-time release fee paid in Bitcoin.', 'caller')).toEqual(expect.arrayContaining(['upfront-fee', 'crypto-wire']));
  });
  it('flags remote access and emotional emergencies', () => {
    expect(ids('Please download the QuickHelp app for screen share.', 'caller')).toContain('remote-access');
    expect(ids('I was in an accident, please help.', 'caller')).toContain('panic');
  });
  it('returns evidence text that appears in the utterance', () => {
    const text = 'Your account will be frozen permanently.';
    for (const f of detect(text, 'caller')) expect(text.toLowerCase()).toContain(f.evidence.toLowerCase());
  });
  it('leaves benign lines alone', () => {
    expect(detect('Hi, how was your weekend?', 'caller')).toEqual([]);
  });
});

describe('user move detection', () => {
  it('flags leaked digits', () => {
    expect(ids('the code is 4 8 1 5 1 6', 'user')).toContain('leak-digits');
  });
  it('flags agreeing to pay and secrecy', () => {
    expect(ids('Okay, I will buy the gift cards', 'user')).toContain('agree-pay');
    expect(ids("I won't tell anyone", 'user')).toContain('agree-secret');
  });
  it('treats verification and refusal as safe', () => {
    expect(ids("I'll call the number on the back of my card", 'user')).toContain('verify');
    expect(ids('No, this is a scam. Goodbye.', 'user')).toContain('refuse');
  });
  it('does not credit refusal when the user also complies', () => {
    const r = ids("I won't hang up, I'll stay on the line", 'user');
    expect(r).toContain('agree-secret');
    expect(r).not.toContain('refuse');
  });
  it('does not count "okay" as compliance when paired with verification', () => {
    const r = ids("Okay, I'll check with my manager", 'user');
    expect(r).toContain('verify');
    expect(r).not.toContain('comply');
  });
});

describe('helpers', () => {
  it('redacts long digit runs', () => {
    expect(redact('code 4815 16 ok')).toBe('code •••• •• ok');
    expect(redact('call at 3')).toBe('call at 3');
  });
  it('detects hang-up intent but not promises to stay', () => {
    expect(isHangUpIntent('Goodbye')).toBe(true);
    expect(isHangUpIntent("I'm hanging up now")).toBe(true);
    expect(isHangUpIntent("I won't hang up")).toBe(false);
  });
  it('has unique rule ids and at least 20 rules', () => {
    expect(new Set(RULES.map((r) => r.id)).size).toBe(RULES.length);
    expect(RULES.length).toBeGreaterThanOrEqual(20);
  });
});
