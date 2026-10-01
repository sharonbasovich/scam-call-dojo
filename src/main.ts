import './styles.css';
import { CATEGORY_LABELS, buildAutopsy, formatTime, shareCard } from './engine/autopsy';
import { CallSession } from './engine/call';
import { SCENARIOS, getScenario } from './engine/scenarios';
import type { Autopsy, Belt, Flag, Scenario, TacticCategory, TranscriptLine } from './engine/types';
import { Recorder, deapiSpeech, deapiTranscribe, playBlob, stopDeapiAudio } from './voice/deapi';
import { MicSession } from './voice/micSession';
import { canListenLocally, canSpeakLocally, listenLocally, speakLocally, stopListening, stopLocalSpeech } from './voice/local';
import { esc, highlight } from './ui/highlight';
import { ICONS } from './ui/icons';
import { startRing, stopRing } from './ui/ringtone';

type VoiceMode = 'text' | 'browser' | 'deapi';
interface Settings {
  voice: VoiceMode;
  coach: boolean;
  speed: number;
  /** Per-mode opt-in, recorded only after the user sees the data warning. */
  consent: { browser: boolean; deapi: boolean };
}

const SETTINGS_KEY = 'scd.settings.v1';
const BEST_KEY = 'scd.best.v1';
const DEAPI_KEY = 'scd.deapiKey';

const app = document.getElementById('app') as HTMLElement;
const live = document.getElementById('sr-live') as HTMLElement;

function loadSettings(): Settings {
  const fallback: Settings = { voice: 'text', coach: true, speed: 1, consent: { browser: false, deapi: false } };
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null') as Partial<Settings> | null;
    return { ...fallback, ...s, consent: { ...fallback.consent, ...(s?.consent ?? {}) } };
  } catch {
    return fallback;
  }
}
let settings = loadSettings();
const saveSettings = () => localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
const deapiKey = () => sessionStorage.getItem(DEAPI_KEY) ?? '';

function bestScores(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}
function recordBest(id: string, score: number): boolean {
  const b = bestScores();
  const improved = b[id] === undefined || score > b[id];
  if (improved) {
    b[id] = score;
    localStorage.setItem(BEST_KEY, JSON.stringify(b));
  }
  return improved;
}

const BELT_LABEL: Record<Belt, string> = { white: 'White', yellow: 'Yellow', orange: 'Orange', green: 'Green', blue: 'Blue', black: 'Black' };

function announce(msg: string): void {
  const p = document.createElement('p');
  p.textContent = msg;
  live.append(p);
  while (live.childElementCount > 5) live.firstElementChild?.remove();
}

let renders = 0;
const narrow = window.matchMedia('(max-width: 480px)');

function render(html: string, focusSel = 'h2'): void {
  app.innerHTML = html;
  app.scrollTop = 0;
  if (renders++ > 0 && narrow.matches) app.closest('.phone')?.scrollIntoView({ block: 'start' });
  (app.querySelector<HTMLElement>(focusSel) ?? app).focus({ preventScroll: true });
}

function clock(): string {
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function statusBar(): string {
  return `<div class="statusbar" aria-hidden="true"><span>${clock()}</span><span>${ICONS.signal}</span></div>`;
}

// ---------- Home ----------
function home(): void {
  cleanupCall();
  const best = bestScores();
  const cards = SCENARIOS.map((s) => {
    const b = best[s.id];
    return `<li><button class="scn belt-${s.belt}" data-id="${s.id}">
      <span class="scn-av av-${s.id}" aria-hidden="true">${s.avatar}</span>
      <span class="scn-body"><span class="scn-title">${esc(s.title)}</span><span class="scn-blurb">${esc(s.blurb)}</span></span>
      <span class="scn-meta"><span class="belt-chip belt-${s.belt}">${BELT_LABEL[s.belt]} belt</span>${b !== undefined ? `<span class="best">Best ${b}</span>` : ''}</span>
    </button></li>`;
  }).join('');
  render(`${statusBar()}
    <div class="home">
      <h2 tabindex="-1">Pick your sparring partner</h2>
      <p class="muted">Each call is fictional. Answer, talk or type back, and hang up when you smell a scam.</p>
      <ul class="scn-list">${cards}</ul>
      <div class="home-foot">
        <button class="ghost" id="settings-btn">${ICONS.gear} Voice &amp; settings</button>
        <span class="mode-pill">${modeLabel()}</span>
      </div>
    </div>`);
  app.querySelectorAll<HTMLButtonElement>('.scn').forEach((b) => b.addEventListener('click', () => ring(getScenario(b.dataset.id as string))));
  app.querySelector('#settings-btn')?.addEventListener('click', settingsScreen);
}

function modeLabel(): string {
  if (settings.voice === 'deapi') return deapiKey() ? 'deAPI voice on' : 'deAPI key missing: captions only';
  if (settings.voice === 'browser') return 'Browser voice on';
  return 'Text only';
}

// ---------- Settings ----------
function settingsScreen(): void {
  const hasKey = !!deapiKey();
  render(`${statusBar()}
    <div class="settings">
      <h2 tabindex="-1">Voice &amp; settings</h2>
      <fieldset>
        <legend>Caller voice</legend>
        <label><input type="radio" name="voice" value="text" ${settings.voice === 'text' ? 'checked' : ''}/> Text only (captions, no audio)</label>
        <label><input type="radio" name="voice" value="browser" ${settings.voice === 'browser' ? 'checked' : ''} ${canSpeakLocally() ? '' : 'disabled'}/> Browser voice (free, built-in voices)</label>
        <label><input type="radio" name="voice" value="deapi" ${settings.voice === 'deapi' ? 'checked' : ''}/> deAPI Kokoro voices + Whisper speech-to-text</label>
        <p class="muted small">Caller speech uses your browser/OS voices — usually on-device. Mic dictation is <b>not</b> guaranteed to stay on this device: most browsers send the audio to their own speech service (Chrome sends it to Google). The app asks before using it, and typing always stays private.</p>
      </fieldset>
      <div class="deapi-box">
        <label for="key">deAPI API key <span class="muted">(kept in this tab only, sent only to oai.deapi.ai)</span></label>
        <div class="row"><input id="key" type="password" autocomplete="off" spellcheck="false" placeholder="${hasKey ? '•••••••• saved for this tab' : 'Paste key'}" />
        <button id="key-save" class="ghost">${hasKey ? 'Replace' : 'Save'}</button>${hasKey ? '<button id="key-clear" class="ghost">Forget</button>' : ''}</div>
        <p class="muted small">Get a key: app.deapi.ai → Settings → API Keys. Kept in this tab only and sent only to deAPI. Preset voices, no voice cloning.</p>
      </div>
      <label class="switch"><input type="checkbox" id="coach" ${settings.coach ? 'checked' : ''}/> Coach mode: show red flags live during the call</label>
      <label for="speed">Caller speaking speed <output id="speed-out">${settings.speed.toFixed(1)}×</output></label>
      <input id="speed" type="range" min="0.7" max="1.5" step="0.1" value="${settings.speed}" />
      <p class="muted small">Microphone: ${canListenLocally() ? 'browser dictation available (opt-in, may send audio to your browser vendor)' : 'browser dictation not supported here'}${Recorder.supported() ? ', recording available for deAPI (opt-in, sent to oai.deapi.ai)' : ''}. Typing always works.</p>
      <button class="primary" id="done">Done</button>
    </div>`);
  app.querySelectorAll<HTMLInputElement>('input[name=voice]').forEach((r) =>
    r.addEventListener('change', () => {
      settings.voice = r.value as VoiceMode;
      saveSettings();
    }),
  );
  const coach = app.querySelector<HTMLInputElement>('#coach') as HTMLInputElement;
  coach.addEventListener('change', () => {
    settings.coach = coach.checked;
    saveSettings();
  });
  const speed = app.querySelector<HTMLInputElement>('#speed') as HTMLInputElement;
  speed.addEventListener('input', () => {
    settings.speed = Number(speed.value);
    (app.querySelector('#speed-out') as HTMLElement).textContent = `${settings.speed.toFixed(1)}×`;
    saveSettings();
  });
  app.querySelector('#key-save')?.addEventListener('click', () => {
    const v = (app.querySelector('#key') as HTMLInputElement).value.trim();
    if (v) sessionStorage.setItem(DEAPI_KEY, v);
    settingsScreen();
  });
  app.querySelector('#key-clear')?.addEventListener('click', () => {
    sessionStorage.removeItem(DEAPI_KEY);
    settingsScreen();
  });
  app.querySelector('#done')?.addEventListener('click', home);
}

// ---------- Voice consent ----------
const CONSENT_COPY: Record<'browser' | 'deapi', { title: string; body: string; ok: string }> = {
  browser: {
    title: 'Browser dictation may send audio off this device',
    body: "Your browser's speech recognition is not guaranteed to run on-device — Chrome sends the audio to Google's servers and other browsers may do the same with their vendor's service. Typing is always fully private.",
    ok: 'Use browser dictation',
  },
  deapi: {
    title: 'deAPI sends audio to oai.deapi.ai',
    body: 'In deAPI mode the caller’s lines are sent to oai.deapi.ai for speech synthesis, and your recorded reply is sent there for Whisper transcription. Nothing is sent in text-only mode.',
    ok: 'Enable deAPI voice',
  },
};

/** Shows the mode-specific data warning once per mode and resolves whether the user opted in. */
function ensureConsent(mode: 'browser' | 'deapi'): Promise<boolean> {
  if (settings.consent[mode]) return Promise.resolve(true);
  pendingConsent?.(false);
  const copy = CONSENT_COPY[mode];
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'consent';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-label', copy.title);
    wrap.innerHTML = `<div class="consent-card"><h3>${esc(copy.title)}</h3><p>${esc(copy.body)}</p>
      <div class="row"><button class="primary" id="consent-ok">${esc(copy.ok)}</button><button class="ghost" id="consent-no">Keep typing</button></div></div>`;
    document.body.append(wrap);
    (wrap.querySelector('#consent-ok') as HTMLElement).focus();
    const done = (ok: boolean) => {
      if (pendingConsent === done) pendingConsent = null;
      if (ok) {
        settings.consent[mode] = true;
        saveSettings();
      }
      wrap.remove();
      resolve(ok);
    };
    pendingConsent = done;
    wrap.querySelector('#consent-ok')?.addEventListener('click', () => done(true));
    wrap.querySelector('#consent-no')?.addEventListener('click', () => done(false));
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        done(false);
      }
    });
  });
}

// ---------- Ringing ----------
let current: CallSession | null = null;
let timerId: number | null = null;
let keyHandler: ((e: KeyboardEvent) => void) | null = null;
let speakToken = 0;
let recorder: Recorder | null = null;
let pendingConsent: ((ok: boolean) => void) | null = null;

function setKeys(h: ((e: KeyboardEvent) => void) | null): void {
  if (keyHandler) document.removeEventListener('keydown', keyHandler);
  keyHandler = h;
  if (h) document.addEventListener('keydown', h);
}

function cleanupCall(): void {
  stopRing();
  stopVoice();
  pendingConsent?.(false);
  if (timerId !== null) window.clearInterval(timerId);
  timerId = null;
  setKeys(null);
}

function ring(s: Scenario): void {
  cleanupCall();
  current = new CallSession(s);
  render(`${statusBar()}
    <div class="ringing">
      <p class="muted">Incoming call…</p>
      <div class="avatar ring-anim av-${s.id}" aria-hidden="true">${s.avatar}</div>
      <h2 tabindex="-1">${esc(s.callerName)}</h2>
      <p class="number">${esc(s.callerNumber)}</p>
      <p class="muted small">Fictional training call · ${BELT_LABEL[s.belt]} belt</p>
      <div class="ring-actions">
        <button class="round decline" id="decline" aria-label="Decline call (D)">${ICONS.close}</button>
        <button class="round accept" id="accept" aria-label="Answer call (A)">${ICONS.phone}</button>
      </div>
      <p class="muted small keys">Keys: A answer · D decline</p>
    </div>`, '#accept');
  announce(`Incoming call from ${s.callerName}, ${s.callerNumber}`);
  startRing();
  const call = current;
  const accept = () => inCall(call);
  const decline = () => {
    call.decline();
    showAutopsy(call);
  };
  app.querySelector('#accept')?.addEventListener('click', accept);
  app.querySelector('#decline')?.addEventListener('click', decline);
  setKeys((e) => {
    if (e.key === 'a' || e.key === 'A') accept();
    if (e.key === 'd' || e.key === 'D') decline();
  });
}

// ---------- In call ----------
function flagChips(flags: Flag[]): string {
  return flags
    .map((f) => {
      const tone = f.side === 'caller' ? `tac-${f.category}` : f.move === 'verify' || f.move === 'refuse' ? 'good' : f.move === 'defer' ? 'warn' : 'bad';
      return `<span class="chip ${tone}">${esc(f.label)}</span>`;
    })
    .join('');
}

function bubble(l: TranscriptLine, coach: boolean): string {
  const who = l.speaker === 'caller' ? 'Caller' : 'You';
  return `<li class="bubble ${l.speaker}"><span class="sr-only">${who}: </span>${coach ? highlight(l.text, l.flags) : esc(l.text)}
    ${coach && l.flags.length ? `<div class="chips">${flagChips(l.flags)}</div>` : ''}<time>${formatTime(l.t)}</time></li>`;
}

/** Stops caller playback and dictation; leaves any user recording untouched. */
function stopPlayback(): void {
  speakToken += 1;
  stopLocalSpeech();
  stopDeapiAudio();
  stopListening();
}

function setMicIdle(): void {
  const m = app.querySelector<HTMLButtonElement>('#mic');
  m?.setAttribute('aria-pressed', 'false');
  m?.classList.remove('rec');
}

/** Full teardown on hang-up/send/cleanup: playback plus the recorder itself. */
function stopVoice(): void {
  stopPlayback();
  recorder?.cancel();
  recorder = null;
  setMicIdle();
}

async function speak(s: Scenario, text: string): Promise<void> {
  const token = ++speakToken;
  const ind = app.querySelector('#speaking');
  ind?.classList.add('on');
  try {
    if (settings.voice === 'deapi' && deapiKey()) {
      if (!(await ensureConsent('deapi'))) {
        if (token === speakToken) notice('deAPI not enabled — using browser voice. Your audio is not sent to deAPI.');
      } else try {
        if (token !== speakToken) return;
        const blob = await deapiSpeech(deapiKey(), text.replace(/\*[^*]+\*/g, ''), s.voice.deapiVoice, Math.min(2, Math.max(0.5, settings.speed)));
        if (token === speakToken) await playBlob(blob);
        return;
      } catch (err) {
        if (token === speakToken) notice(`deAPI voice failed (${(err as Error).message}). Falling back to browser voice.`);
      }
    }
    if (token !== speakToken) return;
    if ((settings.voice === 'browser' || settings.voice === 'deapi') && canSpeakLocally()) {
      await speakLocally(text, { pitch: s.voice.pitch, rate: s.voice.rate * settings.speed });
    }
  } finally {
    if (token === speakToken) app.querySelector('#speaking')?.classList.remove('on');
  }
}

function notice(msg: string): void {
  const n = app.querySelector('#notice');
  if (n) {
    n.textContent = msg;
    n.classList.add('on');
  }
  announce(msg);
}

function inCall(call: CallSession): void {
  stopRing();
  const s = call.scenario;
  const micAvailable = settings.voice === 'deapi' ? !!deapiKey() && Recorder.supported() : settings.voice === 'browser' && canListenLocally();
  const replies = [...s.quickReplies.risky.slice(0, 2), ...s.quickReplies.safe.slice(0, 1), s.quickReplies.risky[2], s.quickReplies.safe[1]].filter(Boolean);
  render(`${statusBar()}
    <div class="incall">
      <header class="call-head">
        <div class="avatar sm av-${s.id}" aria-hidden="true">${s.avatar}</div>
        <div><h2 tabindex="-1">${esc(s.callerName)}</h2><p class="muted small"><span id="timer" aria-label="Call time">0:00</span> · <span id="speaking" class="speaking" aria-hidden="true"><i></i><i></i><i></i></span></p></div>
      </header>
      <p id="notice" class="notice" role="status"></p>
      <ol id="log" class="log" aria-label="Live captions" aria-live="polite"></ol>
      <div class="quick" aria-label="Quick replies">${replies.map((r) => `<button class="qr" type="button">${esc(r)}</button>`).join('')}</div>
      <form id="reply" class="reply" autocomplete="off">
        <label for="say" class="sr-only">Your reply</label>
        <input id="say" placeholder="Type your reply… (made-up details only)" maxlength="240" />
        ${micAvailable ? `<button type="button" id="mic" class="icon" aria-label="Speak your reply" aria-pressed="false">${ICONS.mic}</button>` : ''}
        <button type="submit" class="icon send" aria-label="Send reply">${ICONS.send}</button>
      </form>
      <button id="hang" class="hangup" aria-label="Hang up (Escape)">${ICONS.hangup} Hang up</button>
    </div>`, '#say');

  const log = app.querySelector('#log') as HTMLElement;
  const input = app.querySelector('#say') as HTMLInputElement;
  const push = (l: TranscriptLine) => {
    log.insertAdjacentHTML('beforeend', bubble(l, settings.coach));
    log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
  };
  let finished = false;
  const finish = () => {
    if (finished || call !== current) return;
    finished = true;
    stopVoice();
    window.setTimeout(() => {
      if (call === current) showAutopsy(call);
    }, 400);
  };

  timerId = window.setInterval(() => {
    const t = app.querySelector('#timer');
    if (t) t.textContent = formatTime(call.elapsed());
  }, 500);

  const first = call.answer();
  push(first);
  void speak(s, first.text);

  let busy = false;
  const send = async (text: string) => {
    if (busy || call.ended || call !== current || !text.trim()) return;
    busy = true;
    stopVoice();
    input.value = '';
    const step = call.respond(text);
    push(call.transcript[call.transcript.length - (step.caller ? 2 : 1)]);
    if (step.caller) {
      push(step.caller);
      await new Promise((r) => setTimeout(r, 250));
      if (step.ended) {
        await speak(s, step.caller.text);
        finish();
      } else {
        busy = false;
        void speak(s, step.caller.text);
      }
    } else if (step.ended) {
      finish();
    } else {
      busy = false;
    }
    input.focus();
  };

  app.querySelector('#reply')?.addEventListener('submit', (e) => {
    e.preventDefault();
    void send(input.value);
  });
  app.querySelectorAll<HTMLButtonElement>('.qr').forEach((b) => b.addEventListener('click', () => void send(b.textContent ?? '')));
  const hang = () => {
    call.hangUp();
    finish();
  };
  app.querySelector('#hang')?.addEventListener('click', hang);
  setKeys((e) => {
    if (e.key === 'Escape') hang();
  });

  const mic = app.querySelector<HTMLButtonElement>('#mic');
  let micBusy = false;
  const micSession = new MicSession(
    recorder ?? (recorder = new Recorder()),
    () => ensureConsent('deapi'),
    () => call === current && !call.ended,
  );
  mic?.addEventListener('click', async () => {
    if (micBusy || call.ended || call !== current) return;
    micBusy = true;
    stopPlayback();
    const useDeapi = settings.voice === 'deapi' && !!deapiKey();
    try {
      if (useDeapi) {
        const tap = await micSession.tap();
        if (tap.action === 'started') {
          mic.setAttribute('aria-pressed', 'true');
          mic.classList.add('rec');
          notice('Recording… tap the mic again to send.');
        } else if (tap.action === 'transcribe') {
          setMicIdle();
          notice('Transcribing with deAPI Whisper…');
          const text = await deapiTranscribe(deapiKey(), tap.blob);
          if (call.ended || call !== current) return;
          notice(text ? `Heard: “${text}”` : 'Didn’t catch that. Try again or type.');
          if (text) await send(text);
        } else if (call === current && !call.ended && !micSession.recording) {
          notice('deAPI voice not enabled — nothing was recorded or sent. Typing works.');
        }
      } else {
        if (!(await ensureConsent('browser'))) {
          if (call === current && !call.ended) notice('Dictation not started — nothing was recorded or sent. Typing works.');
          return;
        }
        if (call.ended || call !== current) return;
        mic.setAttribute('aria-pressed', 'true');
        mic.classList.add('rec');
        notice('Listening…');
        const text = await listenLocally();
        if (call.ended || call !== current) return;
        setMicIdle();
        notice(text ? `Heard: “${text}”` : 'Didn’t catch that. Try again or type.');
        if (text) await send(text);
      }
    } catch (err) {
      setMicIdle();
      notice(`${(err as Error).message} You can always type instead.`);
    } finally {
      micBusy = false;
    }
  });
}

// ---------- Autopsy ----------
const OUTCOME_LABEL = { declined: 'Declined', 'hung-up': 'Hung up', scammed: 'Scammed', survived: 'Survived' } as const;

function showAutopsy(call: CallSession): void {
  cleanupCall();
  const s = call.scenario;
  const a: Autopsy = buildAutopsy(call);
  const improved = recordBest(s.id, a.score);
  const cats = (Object.keys(a.tacticCounts) as TacticCategory[]).filter((k) => a.tacticCounts[k] > 0);
  const maxCat = Math.max(1, ...cats.map((k) => a.tacticCounts[k]));
  const risky = a.userMoves.filter((m) => m.move !== 'verify' && m.move !== 'refuse');
  const good = a.userMoves.filter((m) => m.move === 'verify' || m.move === 'refuse');
  const hangIdx = a.hangUpLine ? a.transcript.findIndex((l) => l.speaker === 'caller' && l.text === a.hangUpLine) : -1;

  const timeline = a.transcript
    .map((l, i) => `<li class="tl ${l.speaker} ${i === hangIdx ? 'hang-point' : ''}">
      <time>${formatTime(l.t)}</time>
      <div><span class="who">${l.speaker === 'caller' ? esc(s.callerName) : 'You'}</span>
      <p>${highlight(l.text, l.flags)}</p>
      ${l.flags.length ? `<div class="chips">${flagChips(l.flags)}</div>` : ''}
      ${i === hangIdx ? `<p class="hang-note">${ICONS.hand} Should have hung up here</p>` : ''}</div></li>`)
    .join('');

  render(`${statusBar()}
    <div class="autopsy">
      <h2 tabindex="-1">Call Autopsy</h2>
      <p class="muted small">${esc(s.title)} · ${esc(s.callerName)} · ${formatTime(a.durationMs)} call</p>
      <div class="score-card outcome-${a.outcome}">
        <div class="ring" style="--p:${a.score}" role="img" aria-label="Resistance score ${a.score} out of 100"><span>${a.score}</span><small>/100</small></div>
        <div>
          <p class="outcome">${OUTCOME_LABEL[a.outcome]} · <span class="belt-chip belt-${a.belt}">${BELT_LABEL[a.belt]} belt</span></p>
          <p class="headline">${esc(a.headline)}</p>
          ${improved && a.outcome !== 'declined' ? '<p class="small pb">New personal best</p>' : ''}
          <p class="muted small">Heuristic score: it counts pattern-matched safe and risky moves — useful training feedback, not a measure of real-world skill.</p>
        </div>
      </div>
      ${a.hangUpAt !== null ? `<div class="hang-callout"><strong>Hang-up moment: ${formatTime(a.hangUpAt)}</strong><p>“${esc(a.hangUpLine ?? '')}”</p>
        ${a.lingeredMs > 1000 ? `<p class="small">You stayed on for another <strong>${Math.round(a.lingeredMs / 1000)}s</strong> after this.</p>` : ''}</div>` : ''}
      ${cats.length ? `<h3>Tactics used on you</h3><ul class="bars">${cats.map((k) => `<li><span>${CATEGORY_LABELS[k]}</span><span class="bar"><i class="tac-${k}" style="width:${(a.tacticCounts[k] / maxCat) * 100}%"></i></span><b>${a.tacticCounts[k]}</b></li>`).join('')}</ul>` : ''}
      ${risky.length || good.length ? `<h3>Your moves</h3><div class="chips">${flagChips([...risky, ...good].filter((f, i, all) => all.findIndex((g) => g.ruleId === f.ruleId) === i))}</div>` : ''}
      ${a.transcript.length ? `<h3>Timestamped transcript</h3><ol class="timeline">${timeline}</ol>` : ''}
      <h3>The tell</h3><p>${esc(s.tell)}</p>
      <h3>Say this next time</h3><p class="script">${esc(s.safeScript)}</p>
      ${a.tips.length ? `<details><summary>Why each tactic works (${a.tips.length})</summary><ul class="tips">${a.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></details>` : ''}
      <div class="actions">
        <button class="primary" id="retry">${ICONS.retry} Retry this call</button>
        <button class="ghost" id="share">${ICONS.share} Share with Grandma</button>
        <button class="ghost" id="back">${ICONS.back} Back to the dojo</button>
      </div>
      <p id="share-status" class="small muted" role="status"></p>
    </div>`);
  announce(`Call ended. ${OUTCOME_LABEL[a.outcome]}. Resistance score ${a.score} out of 100.`);
  app.querySelector('#retry')?.addEventListener('click', () => ring(s));
  app.querySelector('#back')?.addEventListener('click', home);
  app.querySelector('#share')?.addEventListener('click', async () => {
    const text = shareCard(a, s.title, s.tell, s.safeScript);
    const status = app.querySelector('#share-status') as HTMLElement;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Scam Call Dojo', text });
        status.textContent = 'Shared.';
      } else {
        await navigator.clipboard.writeText(text);
        status.textContent = 'Copied a safety card to your clipboard. Paste it to family.';
      }
    } catch {
      status.textContent = text;
    }
  });
}

home();
