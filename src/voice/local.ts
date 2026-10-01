interface RecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const canSpeakLocally = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window;
export const canListenLocally = (): boolean => typeof window !== 'undefined' && recognitionCtor() !== null;

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => /en[-_](US|CA|GB)/i.test(v.lang) && /natural|google|samantha|daniel/i.test(v.name)) ?? voices.find((v) => v.lang.startsWith('en'));
}

export function speakLocally(text: string, opts: { pitch: number; rate: number }): Promise<void> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/\*[^*]+\*/g, ''));
    u.pitch = opts.pitch;
    u.rate = opts.rate;
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    synth.speak(u);
  });
}

export function stopLocalSpeech(): void {
  if (canSpeakLocally()) window.speechSynthesis.cancel();
}

let active: Recognition | null = null;

/** One-shot dictation using the browser's built-in recogniser. */
export function listenLocally(): Promise<string> {
  const Ctor = recognitionCtor();
  if (!Ctor) return Promise.reject(new Error('Speech recognition is not available in this browser.'));
  active?.abort();
  return new Promise((resolve, reject) => {
    const r = new Ctor();
    active = r;
    r.lang = 'en-US';
    r.interimResults = false;
    r.maxAlternatives = 1;
    let heard = '';
    r.onresult = (e) => {
      heard = Array.from(e.results).map((res) => res[0].transcript).join(' ');
    };
    r.onerror = (e) => {
      if (e.error === 'aborted' || e.error === 'no-speech') {
        resolve('');
        return;
      }
      reject(new Error(e.error === 'not-allowed' ? 'Microphone permission was denied.' : `Speech recognition error: ${e.error}`));
    };
    r.onend = () => {
      active = null;
      resolve(heard.trim());
    };
    r.start();
  });
}

export function stopListening(): void {
  active?.abort();
}
