# Scam Call Dojo

**A flight simulator for scam phone calls. Get scammed here, not out there.**

A phone rings in your browser. A fictional scammer runs a real playbook on you: a "bank fraud team", a too-good internship, your "boss" who needs gift cards. You answer by typing or by talking. When the call ends, the **Call Autopsy** shows each pressure tactic with a timestamp, your Resistance Score and belt, and the exact second you should have hung up.

Built for students and their families. Try it on the scam before a real one reaches you.

## Features

- **Six fictional scenarios**, white belt to black belt: The Frozen Account, The Dream Internship, The Boss in a Meeting, The Stuck Parcel, The Recovery Agent, The Family Emergency.
- **Deterministic tactic detector.** 24 transparent rules cover caller tactics (urgency, authority, secrecy, payment rails, info harvest, emotion) and your moves (leaks, compliance, verifying, refusing). The same input always gives the same verdict, with no LLM involved. It is a keyword heuristic, not language understanding: 'verified independently' only counts when you name a source you already trust (the number on your card, the official app, someone you know) — asking the caller to email you or call back scores as deferring to the caller's own channel instead.
- **Branching call engine.** The scammer pushes back when you resist and pushes harder when you slip. The call ends when you hang up, stand firm twice, or give up a code or payment.
- **Timestamped Call Autopsy.** Shows the score (0–100), belt, tactic counts, the hang-up moment, how long you stayed on the line after it, the tell and a safe script to use. A "Share with Grandma" safety card copies it to the clipboard.
- **Accessible by default.** Text input always works, with no microphone needed. Includes keyboard shortcuts (A answer, D decline), a live region for screen readers, visible focus styles, reduced-motion support and a full mobile layout.
- **Voice, three ways:**
  1. Text only (captions).
  2. Browser voice: built-in `speechSynthesis` for the caller (usually on-device) and browser `SpeechRecognition` dictation for replies. Free, with no key. Dictation is opt-in: most browsers send recognition audio to their vendor's service (Chrome sends it to Google), so the app warns and asks before first use. Typing never sends anything.
  3. **deAPI**: Kokoro preset voices for the caller and Whisper Large V3 transcription for your replies. Bring your own key; it is kept in `sessionStorage` for that tab and sent only to deAPI. Because it lives in the browser, use a key you can revoke.

## Safety

- Every person, company, case number and phone number is made up (555‑010‑01xx numbers are reserved for fiction).
- The app never places calls or sends SMS. It has no backend and no analytics.
- Runs of 4 or more digits you type or say are masked (`••••`) in the transcript.
- The app uses deAPI's preset Kokoro voices only. It never uses voice cloning.
- Typing and text-only mode send nothing anywhere. Browser dictation may send your audio to your browser vendor's recognition service; the app shows the warning and asks before starting it. With deAPI enabled, only the caller's line (TTS) or your recorded reply (STT) is sent to `oai.deapi.ai`, after an explicit opt-in.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 61 unit tests (Vitest)
npm run typecheck
npm run build      # static site in dist/
```

The build is a static site with relative asset paths, so it can be hosted anywhere (GitHub Pages workflow included in `.github/workflows/pages.yml`).

### deAPI (optional)

1. Create a key at <https://app.deapi.ai> → Settings → API Keys.
2. In the app, go to **Voice & settings** → select **deAPI** → paste the key → **Save**.

Calls go to `https://oai.deapi.ai/v1/audio/speech` (model `Kokoro`) and `/v1/audio/transcriptions` (model `WhisperLargeV3`). If a request fails, the app shows the error and falls back to captions and typing.

## Architecture

```
src/engine/   pure TypeScript, no DOM
  rules.ts      23 regex rules with severity + explanation
  detector.ts   detect(), redact(), hang-up intent
  scenarios.ts  6 scripted, branching scenarios
  call.ts       CallSession state machine (answer/respond/hangUp)
  autopsy.ts    score, belt, hang-up point, share card
src/voice/    local.ts (Web Speech) · deapi.ts (TTS/STT + recorder)
src/ui/       highlight.ts (safe evidence markup) · ringtone.ts (Web Audio) · icons.ts
src/main.ts   screens: dojo → ringing → call → autopsy / settings
tests/        detector, call engine, autopsy, deAPI request shape, highlighting
```

## Built during LovHack Season 3

All code, copy and design in this repo were created from scratch during the LovHack Season 3 build window (Sep 26 to Oct 4, 2026); see the commit history. No code was reused from earlier projects. Third-party pieces: Vite, TypeScript and Vitest (MIT), the browser Web Speech and Web Audio APIs, and the optional deAPI API. Icons are hand-written inline SVG. AI coding assistance was used, and it is disclosed in the Devpost write-up.

MIT licensed.
