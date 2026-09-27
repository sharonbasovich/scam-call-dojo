# Devpost submission copy: Scam Call Dojo

> Paste into the LovHack Season 3 project form. Fill in the bracketed links after deploying and recording.

**Project name:** Scam Call Dojo

**Tagline (≤ 60 chars):** A flight simulator for scam phone calls.

**Demo:** [live URL]  ·  **Video:** [YouTube link, 2–3 min]  ·  **Code:** [GitHub URL]

---

## Inspiration
The phone rings. "Hi, this is Daniel from your bank's fraud department." Most of us *know* the rules, like never share the code and never pay in gift cards. We still fall for it, because knowing the rule and following it with a stranger rushing you are different skills. Pilots don't learn engine failures from a pamphlet; they crash in a simulator first. We wanted that for scam calls: somewhere you can get scammed safely, see exactly how it happened, and try again.

Students are a big target (fake internships, "boss" gift-card texts, parcel fees, crypto "recovery"), and so are our grandparents. Scam Call Dojo is built for both.

## What it does
1. **A phone rings in your browser.** Pick one of six fictional scam calls, from white belt to black belt: a frozen bank account, a dream internship, your boss in a meeting, a stuck parcel, a crypto recovery agent, and a family emergency.
2. **You answer.** The scammer speaks, using browser voice or deAPI Kokoro voices, and you reply by typing, tapping a quick reply, or talking (browser dictation or deAPI Whisper). The script branches: resist and it pushes back, slip and it pushes harder.
3. **Coach mode** highlights red flags live as they're said: *Fake deadline*, *Borrowed authority*, *Asks for a one-time code*, *Untraceable payment*.
4. **The Call Autopsy.** When the call ends you get:
   - a **Resistance Score** and **belt**;
   - the **hang-up moment**, the exact timestamped line where you should have hung up, and how many seconds you stayed on after it;
   - tactic counts, your good and bad moves, and the full timestamped transcript with the trigger words highlighted;
   - **the tell** and a **"Say this instead"** script;
   - a **Share with Grandma** safety card.

## How we built it
- **Vite + TypeScript**, a static site with no backend, deployed on GitHub Pages.
- **A deterministic engine, not an LLM guess.** 23 regex rules with severity and plain-language explanations detect six caller tactic families and five user-move types. A `CallSession` state machine drives the scripted, branching scenarios, and `buildAutopsy()` scores the call. Same input, same verdict, every time, so the feedback is explainable and testable.
- **37 Vitest tests** cover detection, false-positive guards ("Oh no!" is not a refusal), redaction, scenario transitions, scoring, timestamps and the deAPI request format.
- **Voice:** Web Speech API for free on-device voice and dictation, plus **deAPI** for Kokoro TTS with a preset voice per character and Whisper Large V3 STT on recorded replies.
- **Accessibility:** typing always works, with no mic required. The app has captions for every line, a screen-reader live region, keyboard shortcuts, focus management, reduced motion, and a mobile layout.

## Best Use of deAPI
deAPI is the scammer's voice and the user's ears:
- `POST /v1/audio/speech` with `model: "Kokoro"`: each fictional caller has its own preset voice (e.g. `am_onyx` for the "bank", `af_nova` for the recruiter), so calls feel real.
- `POST /v1/audio/transcriptions` with `model: "WhisperLargeV3"`: your spoken reply is recorded in the browser and transcribed, then run through the same deterministic detector.
- The key is user-supplied at runtime and kept in `sessionStorage` only; it is never bundled into the site. deAPI doesn't support voice cloning, and we only use preset voices.

## Challenges we ran into
- **False positives.** "Oh no! What do you need?" first counted as a *refusal* because of the word "no", and "I'll stay on the line" slipped through because of a curly apostrophe. We normalise punctuation and resolve conflicting user moves, with a test for each case.
- **Scoring the right moment.** "When should I have hung up?" needed a rule that is simple and still fair. We use the first caller line with a critical tactic (a code, a password or payment) or with enough pressure stacked up. The time you stay on after that point costs you score.
- **Keeping it safe.** We avoided real brands and people, use reserved fictional 555 numbers, mask digit runs, send no real calls or SMS, and use no voice cloning.

## Accomplishments we're proud of
- It's fun. Getting scammed and then seeing the exact second it went wrong makes people want to replay.
- The feedback is fully explainable: every flag points to the exact words that triggered it.
- It works with no mic, no key and no account.

## What we learned
Scams share one structure: authority, then urgency, then secrecy, then an untraceable payment or a code. Once you can name the pattern, you notice it on the next call.

## What's next
Multilingual scenarios, spoken tones for grandparents (slower, larger text), a classroom mode with leaderboards for high-school digital-literacy classes, and user-submitted (moderated, fictionalised) scripts.

## Built with
`typescript` · `vite` · `vitest` · `web-speech-api` · `web-audio-api` · `deapi` (Kokoro TTS, Whisper STT) · `github-pages` · `html5` · `css3`

---

## Built during the hackathon (disclosure)
- **Everything in this project was built during LovHack Season 3 (Sep 26 to Oct 4, 2026)** in a brand-new repository; the commit history starts on Sep 27, 2026. No code, designs or content come from earlier projects.
- **Pre-existing, third-party pieces we used:** Vite, TypeScript and Vitest (open source, MIT); the browser Web Speech and Web Audio APIs; the deAPI hosted API (optional, for TTS/STT). Icons are hand-written inline SVG.
- **AI assistance:** AI coding tools helped write and review code and copy, as the rules allow. I designed, understand and can demo every part of the project.
- **Safety:** all callers, companies, numbers and details are fictional. The app never places calls or sends texts and uses no real personal data or voice cloning.
