import type { Rule } from './types';

export const RULES: Rule[] = [
  // ---- Caller tactics ----
  {
    id: 'deadline', label: 'Countdown pressure', side: 'caller', category: 'urgency', severity: 2,
    patterns: [/\b(within|in the next)\s+\d+\s+(minutes?|hours?|seconds?)\b/i, /\b(right now|immediately|as soon as possible|asap|before (it'?s|it is) too late|today only|by end of day|expires?)\b/i],
    explain: 'Real organisations give you time. A ticking clock is there to stop you thinking.',
  },
  {
    id: 'threat', label: 'Threat of loss', side: 'caller', category: 'urgency', severity: 2,
    patterns: [/\b(frozen|freeze|locked|suspend(ed)?|closed?|arrest(ed)?|warrant|legal action|lose (it|everything|the (spot|offer|money))|permanently)\b/i],
    explain: 'Fear of losing access, money or an opportunity pushes people to act before verifying.',
  },
  {
    id: 'impersonate-org', label: 'Borrowed authority', side: 'caller', category: 'authority', severity: 2,
    patterns: [/\b(fraud (department|team)|security (team|department)|head office|compliance|police|government|revenue agency|tax office|hiring (manager|team)|dispatch|recovery (unit|agency|team))\b/i],
    explain: 'Claiming to be from an official team is free. Caller ID and titles can be faked.',
  },
  {
    id: 'badge-number', label: 'Fake credentials', side: 'caller', category: 'authority', severity: 1,
    patterns: [/\b(badge|employee|case|reference|ticket|claim)\s*(number|no\.?|#|id)\b/i, /\bi('?m| am) (agent|officer|inspector|manager)\b/i],
    explain: 'Reciting a badge or case number sounds official but proves nothing.',
  },
  {
    id: 'already-know', label: 'Knows a little about you', side: 'caller', category: 'authority', severity: 1,
    patterns: [/\b(i can see|our records show|we (can )?see|it shows here|i have (your|the) (file|account))\b/i],
    explain: 'Scammers open with details that feel private but are often public or guessed.',
  },
  {
    id: 'secrecy', label: 'Keep it secret', side: 'caller', category: 'secrecy', severity: 3,
    patterns: [/\b(don'?t|do not) (tell|mention|call|talk to|let)\b/i, /\b(keep (this|it) (between us|quiet|confidential|secret)|confidential|stay on the line|don'?t hang up)\b/i],
    explain: 'Isolation is the tell. Legit callers never mind you hanging up to check with someone.',
  },
  {
    id: 'gift-card', label: 'Gift-card payment', side: 'caller', category: 'payment', severity: 3,
    patterns: [/\b(gift ?cards?|itunes|google play|steam cards?|prepaid cards?|scratch (off|the back))\b/i],
    explain: 'No real employer, bank or government takes payment in gift cards. Ever.',
  },
  {
    id: 'crypto-wire', label: 'Untraceable payment', side: 'caller', category: 'payment', severity: 3,
    patterns: [/\b(bitcoin|crypto(currency)?|usdt|wallet address|wire transfer|western union|moneygram|e-?transfer|safe account|holding account|atm)\b/i],
    explain: 'Crypto, wires and “safe accounts” are chosen because the money cannot be pulled back.',
  },
  {
    id: 'upfront-fee', label: 'Pay to get paid', side: 'caller', category: 'payment', severity: 3,
    patterns: [/\b((small|one-time|refundable|processing|release|customs|redelivery|starter|onboarding|recovery|equipment) (fee|deposit|charge|payment|kit))\b/i, /\bpay (a|the) (fee|deposit)\b/i],
    explain: 'If you have to pay to receive a job, refund or parcel, it is not a job, refund or parcel.',
  },
  {
    id: 'otp', label: 'Asks for a one-time code', side: 'caller', category: 'harvest', severity: 3,
    patterns: [/\b(one[- ]time (code|passcode|password)|verification code|security code|the code (we|i) (just )?(sent|texted)|six[- ]digit|6[- ]digit|otp)\b/i],
    explain: 'A one-time code is a key to your account. Anyone asking for it is trying to open the door.',
  },
  {
    id: 'credentials', label: 'Asks for secrets', side: 'caller', category: 'harvest', severity: 3,
    patterns: [/\b(password|pin( number)?|card number|cvv|security question|sin|social insurance|social security|banking (login|details)|login details|seed phrase|recovery phrase)\b/i],
    explain: 'Your bank already has your details. Being asked to “confirm” them is harvesting.',
  },
  {
    id: 'personal-info', label: 'Fishing for identity', side: 'caller', category: 'harvest', severity: 2,
    patterns: [/\b(date of birth|full name|home address|mother'?s maiden|confirm your (identity|address|details)|photo of your id|driver'?s licen[cs]e)\b/i],
    explain: 'Small “verification” details add up to identity theft.',
  },
  {
    id: 'remote-access', label: 'Wants control of a device', side: 'caller', category: 'harvest', severity: 3,
    patterns: [/\b(download|install) (an?|the|this) (app|program|software)\b/i, /\b(anydesk|teamviewer|remote access|screen ?share)\b/i],
    explain: 'Remote-access apps hand a stranger the keys to your phone or laptop.',
  },
  {
    id: 'too-good', label: 'Too good to be true', side: 'caller', category: 'emotion', severity: 1,
    patterns: [/\b(guaranteed|congratulations|you('?ve| have) been (selected|chosen)|no interview|double|risk[- ]free|recover (all|100%|your))\b/i],
    explain: 'Excitement lowers your guard as effectively as fear does.',
  },
  {
    id: 'panic', label: 'Emotional emergency', side: 'caller', category: 'emotion', severity: 2,
    patterns: [/\b(accident|hospital|jail|bail|in trouble|scared|please help|crying|emergency)\b/i],
    explain: 'Panic about someone you love is the fastest way to skip verification.',
  },
  {
    id: 'guilt', label: 'Guilt trip', side: 'caller', category: 'emotion', severity: 1,
    patterns: [/\b(i('?m| am) trying to help you|don'?t you trust me|you('?ll| will) regret|it('?s| is) your fault|wasting my time)\b/i],
    explain: 'Making you feel rude for asking questions is a pressure tactic, not customer service.',
  },

  // ---- User moves ----
  {
    id: 'leak-digits', label: 'Shared a code or number', side: 'user', move: 'leak', severity: 3,
    patterns: [/(?:\d[\s-]?){4,}/, /\b(the code is|my (pin|password|card number|code) is|it'?s (zero|one|two|three|four|five|six|seven|eight|nine))\b/i],
    explain: 'You read out digits. In a real call that could be the code that empties your account.',
  },
  {
    id: 'leak-identity', label: 'Shared personal details', side: 'user', move: 'leak', severity: 2,
    patterns: [/\b(my (address|date of birth|birthday|sin|full name|mother'?s maiden name) is|i live (at|on)|i was born)\b/i],
    explain: 'Identity details are reusable forever. Hang up first; verify later.',
  },
  {
    id: 'agree-pay', label: 'Agreed to pay', side: 'user', move: 'comply', severity: 3,
    patterns: [/\b(i('?ll| will|'?m going to| am going to|'?m gonna| can) (pay|send|buy|transfer|wire|download|(get|grab) (them|(the |some )?(gift )?(cards?|money|bitcoin|crypto)))|sending (it|now|the money)|how (much|do i pay)|where do i send|ok(ay)?,? i('?ll| will) do it|here it is|let me (pay|send|buy|get the cards))\b/i],
    explain: 'Agreeing to pay is the moment the scam succeeds. Nothing legitimate needs it on this call.',
  },
  {
    id: 'comply', label: 'Went along with it', side: 'user', move: 'comply', severity: 1,
    patterns: [/^\s*(yes|yeah|yep|sure|ok(ay)?|alright|fine|go ahead)\b/i, /\b(yes|yeah|sure|ok(ay)?)\b.*\?|\b(what do (i|you) need|what (should|do) i (do|need to do)|how do i|tell me what to do|i('?ll| will) help)\b/i],
    explain: 'Each “okay” gives the caller momentum. You are allowed to stop and check.',
  },
  {
    id: 'agree-secret', label: 'Agreed to keep it secret', side: 'user', move: 'secrecy-agree', severity: 2,
    patterns: [/\b(i won'?t tell|i('?ll| will) keep it (quiet|secret|between us)|i won'?t hang up|i('?ll| will) stay on)\b/i],
    explain: 'Promising secrecy cuts you off from the people who would spot this instantly.',
  },
  {
    id: 'verify', label: 'Verified independently', side: 'user', move: 'verify', severity: 1,
    patterns: [/\b(call (you|them|the bank|my bank|the company|back)|official (number|website|app)|number on (the back|my card)|check with|verify|log in (myself|on my own)|look (it|you) up|ask my (mom|mum|dad|parents?|manager|boss|family)|(let me|i('?ll| will)|i('?m| am) going to) (call|text|ask) my|email me|in writing)\b/i],
    explain: 'Hanging up and contacting the organisation through a number you already trust beats every script.',
  },
  {
    id: 'refuse', label: 'Refused or called it out', side: 'user', move: 'refuse', severity: 1,
    patterns: [/\b((?<!oh )no\b(?! (problem|idea|worries))|no way|not a chance|nope|not (going to|gonna)|i won'?t|i don'?t (give|share)|this (is|sounds like) a scam|(?<!(isn'?t|not) a )scam(mer)?(?!,? right)|goodbye|bye|hang(ing)? up|not interested|stop calling)\b/i],
    explain: 'A clear no ends the game. Scammers only win on calls that keep going.',
  },
];
