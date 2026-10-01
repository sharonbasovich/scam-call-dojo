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

describe('user move edge cases', () => {
  it('catches payment agreements phrased as plans', () => {
    for (const t of ["I'm going to send you the money now", 'Okay, I am going to buy the gift cards', "I'll wire it", "I'll get them now", 'Fine, here it is'])
      expect(ids(t, 'user')).toContain('agree-pay');
  });
  it('does not treat verification plans as payment', () => {
    for (const t of ["I'll get the number from my card and call the bank", "I'll do it myself on the official app"]) expect(ids(t, 'user')).not.toContain('agree-pay');
  });
  it('does not credit refusal for "no idea" or "not a scam, right?"', () => {
    expect(ids('I have no idea', 'user')).not.toContain('refuse');
    expect(ids("This isn't a scam, right?", 'user')).not.toContain('refuse');
    expect(ids('Not a chance', 'user')).toContain('refuse');
  });
  it('credits checking with a trusted person, but not caller-controlled channels', () => {
    expect(ids('Hold on, let me call my dad', 'user')).toContain('verify');
    expect(ids('Can you email me instead?', 'user')).toContain('defer-channel');
    expect(ids('Can you email me instead?', 'user')).not.toContain('verify');
  });
});

describe('verification semantics', () => {
  it('does not credit caller-controlled channels as independent verification', () => {
    for (const t of ['Email me', 'Call you back', "I'll call back", 'Send me a text', 'Put it in writing', "What's your number?", 'Send me the link', 'Text it to me']) {
      const r = ids(t, 'user');
      expect(r, t).toContain('defer-channel');
      expect(r, t).not.toContain('verify');
    }
  });
  it('still credits trusted-source verification and known-number call-backs', () => {
    for (const t of [
      "I'll call the number on the back of my card",
      "I'll call you back on your old number",
      "I'm going to call you back on your usual number",
      "I'll check with the office first",
      'Let me verify this on the official website',
      "I'll contact my exchange through the official app",
      'Hang up and call the number on my card',
      'Let me look it up myself',
      "I'll ask my mom",
      'I will call the bank on the number I have',
    ]) expect(ids(t, 'user'), t).toContain('verify');
  });
  it('does not count negated or quoted safe phrases', () => {
    for (const t of [
      "I can't call the number on my card",
      "I won't check with my bank",
      "I'm not going to verify anything",
      "This isn't a scam, I'm not calling anyone",
      "I never call back",
      'He said "call the number on your card"',
      'The script says "hang up and call the bank"',
    ]) expect(ids(t, 'user'), t).not.toContain('verify');
    for (const t of ["I can't say this is a scam", "I'm not saying no"]) expect(ids(t, 'user'), t).not.toContain('refuse');
  });
  it('negation in an earlier clause does not block a later safe move', () => {
    expect(ids("I don't share codes. I'll call the number on my card", 'user')).toContain('verify');
    expect(ids("Employers don't charge fees. This is a scam. Bye.", 'user')).toContain('refuse');
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
    expect(isHangUpIntent("I'm going to send the money")).toBe(false);
    expect(isHangUpIntent("I'm going now")).toBe(true);
  });
  it('has unique rule ids and at least 20 rules', () => {
    expect(new Set(RULES.map((r) => r.id)).size).toBe(RULES.length);
    expect(RULES.length).toBeGreaterThanOrEqual(20);
  });
});
