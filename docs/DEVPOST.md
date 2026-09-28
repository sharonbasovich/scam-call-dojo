# Devpost submission copy: Scam Call Dojo

> Paste into the LovHack Season 3 project form.
>
> **Pre-submission check for Sharon (delete before pasting):** the rules require participants to understand, present and demonstrate the project. Before submitting, personally review the live app, the demo video and every claim below, and edit anything you can't explain or stand behind. The video has captions only; if you add narration or re-record it, update the Video link.

**Project name:** Scam Call Dojo

**Tagline (≤ 60 chars):** Get scammed here, not out there.

**Elevator pitch (≤ 200 chars):** A flight simulator for scam phone calls. A fictional scammer calls you in the browser, you try to resist, and a Call Autopsy shows the exact second you should have hung up.

**Demo:** https://sharonbasovich.github.io/scam-call-dojo/  ·  **Video (2:25, captioned):** https://sharonbasovich.github.io/scam-call-dojo/demo/  ·  **Code:** https://github.com/sharonbasovich/scam-call-dojo

---

## In 10 seconds
Your phone rings: *"Hi, this is Daniel from your bank's fraud department."* You answer, by typing or talking. He pushes. You read him the code. **Scammed · 38/100 · White belt.** The Call Autopsy then pins the exact timestamped line where you should have hung up, names every trick he used, and gives you a script to say next time. Then you try again.

## Inspiration
Everyone knows "never share the code". People share it anyway, because knowing a rule and following it while a confident stranger rushes you are different skills. Pilots don't learn engine failures from a pamphlet; they practise in a simulator. Scam calls have no simulator, so we built one.

Students are a major target: fake remote internships with a "starter fee", a "boss" who needs gift cards before a meeting, parcel "customs fees", crypto "recovery agents". Our grandparents get the "your grandson is in trouble" call. Scam Call Dojo trains all of these, safely.

## What it does
1. **A fictional scam call rings.** Six scenarios, white belt to black belt: The Frozen Account, The Dream Internship, The Boss in a Meeting, The Stuck Parcel, The Recovery Agent, The Family Emergency.
2. **You respond.** Type, tap a quick reply, or talk (browser dictation or deAPI Whisper). The caller speaks through browser voice or a deAPI Kokoro preset voice. The call branches: resist and he escalates; slip and he closes in. Read out a code or agree to pay and the call ends as **Scammed**.
3. **Coach mode** (optional) underlines red flags live: *Fake deadline*, *Borrowed authority*, *Asks for a one-time code*, *Untraceable payment*.
4. **The Call Autopsy:** a Resistance Score and belt, the timestamped **hang-up moment** and how long you stayed on after it, tactic counts, your good and risky moves, the masked transcript with trigger words highlighted, **the tell**, a **"Say this instead"** script, and a copyable **Share with Grandma** safety card.

## How we built it
- **Vite + TypeScript** static site, no backend, no accounts, no analytics, deployed on GitHub Pages.
- **Deterministic and explainable, no LLM in the loop.** 23 regex rules (with severity and a plain-language explanation) detect caller tactics and user moves. A `CallSession` state machine drives the scripted branching calls and `buildAutopsy()` scores them. Same input, same verdict, every time, and every flag points to the words that triggered it.
- **42 Vitest tests** run in CI before each deploy. They cover detection, false-positive guards ("Oh no!", "I have no idea" and "this isn't a scam, right?" are not refusals; "I'm going to send the money" is not a hang-up), first-reply leaks, redaction, branching, scoring and the deAPI request format.
- **Accessible by default:** typing always works with no mic or key, every line is captioned, screen-reader live region, keyboard shortcuts (A answer / D decline), focus management, reduced motion, and a full-screen mobile layout.

## deAPI integration
deAPI is optional and gives the scammer a voice and the user ears:
- `POST /v1/audio/speech`, `model: "Kokoro"`: each fictional caller has its own **preset** voice (`am_onyx` for the "bank", `af_nova` for the recruiter, …).
- `POST /v1/audio/transcriptions`, `model: "WhisperLargeV3"`: your recorded reply is transcribed, then scored by the same deterministic detector.
- The user pastes their own key at runtime. It is never bundled into the site; it is kept in `sessionStorage` for that tab and sent only to deAPI. Because it lives in the browser, use a key you are comfortable revoking. Scam Call Dojo uses preset voices only and never uses voice cloning.

## Challenges we ran into
- **Words lie.** "Oh no! What do you need?" first counted as a refusal, and "I'm going to send you the money" looked like "I'm going (to hang up)". We normalise punctuation, narrow each pattern, resolve conflicting moves (a leak beats a refusal) and add a regression test for each case.
- **When should you have hung up?** We use the first caller line with a critical ask (a code, a password, a payment) or enough stacked pressure. Staying on after it costs points.
- **Safety.** No real brands or people, reserved 555 numbers, digit runs masked, no real calls or SMS, no voice cloning.

## Accomplishments we're proud of
- It's replayable: seeing the exact second it went wrong makes you want another round.
- Feedback you can trust, because it's deterministic and every flag is explained.
- Works with no mic, no key and no account, on desktop and phone.

## What we learned
Scam calls share one structure: authority, then urgency, then secrecy, then a code or an untraceable payment. Once you can name the pattern, you hear it on the next call.

## What's next
More languages, a slower large-text mode for grandparents, a classroom mode for digital-literacy lessons, and moderated, fictionalised community scripts.

## Built with
`typescript` · `vite` · `vitest` · `web-speech-api` · `web-audio-api` · `deapi` (Kokoro TTS, Whisper STT) · `github-pages` · `html5` · `css3`

---

## Built during the hackathon (disclosure)
- Built during LovHack Season 3 (Sep 26 to Oct 4, 2026) in a new repository; the commit history starts on Sep 27, 2026. No code, designs or content come from earlier projects.
- Third-party pieces: Vite, TypeScript and Vitest (open source, MIT); the browser Web Speech and Web Audio APIs; the optional deAPI hosted API. Icons are hand-written inline SVG.
- **AI assistance:** AI coding tools were used to write, test and review code and copy, as the rules allow. During submission prep, an AI agent (Devin) audited the app, fixed detector bugs, rewrote this write-up, and produced the screenshots and the demo video. The video is an automated, captioned screen recording of the live app with no voice narration.
- **Safety:** all callers, companies, numbers and details are fictional. The app never places calls or sends texts, stores no personal data on a server, and uses no voice cloning.
