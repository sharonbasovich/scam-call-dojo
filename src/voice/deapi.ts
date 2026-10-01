export const DEAPI_BASE = 'https://oai.deapi.ai/v1';
export const DEAPI_TTS_MODEL = 'Kokoro';
export const DEAPI_STT_MODEL = 'WhisperLargeV3';

export class DeapiError extends Error {}

async function check(res: Response): Promise<Response> {
  if (res.ok) return res;
  let detail = `${res.status}`;
  try {
    const body = (await res.json()) as { error?: { message?: string; code?: string } };
    if (body.error?.message) detail = `${res.status} ${body.error.code ?? ''} ${body.error.message}`.trim();
  } catch {
    // non-JSON error body
  }
  throw new DeapiError(`deAPI request failed: ${detail}`);
}

/** Preset Kokoro voice synthesis (no cloning). Returns MP3 bytes. */
export async function deapiSpeech(key: string, text: string, voice: string, speed = 1, fetchImpl: typeof fetch = fetch): Promise<Blob> {
  const res = await fetchImpl(`${DEAPI_BASE}/audio/speech`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: DEAPI_TTS_MODEL, voice, input: text, response_format: 'mp3', speed }),
  });
  return (await check(res)).blob();
}

export async function deapiTranscribe(key: string, audio: Blob, fetchImpl: typeof fetch = fetch): Promise<string> {
  const form = new FormData();
  const ext = audio.type.includes('ogg') ? 'ogg' : audio.type.includes('mp4') ? 'mp4' : 'webm';
  form.append('file', audio, `reply.${ext}`);
  form.append('model', DEAPI_STT_MODEL);
  form.append('language', 'en');
  form.append('response_format', 'json');
  const res = await fetchImpl(`${DEAPI_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  const body = (await (await check(res)).json()) as { text?: string };
  return (body.text ?? '').trim();
}

let currentAudio: HTMLAudioElement | null = null;

export async function playBlob(blob: Blob): Promise<void> {
  stopDeapiAudio();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  currentAudio = audio;
  try {
    await new Promise<void>((resolve) => {
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      audio.onpause = () => resolve();
      audio.play().catch(() => resolve());
    });
  } finally {
    URL.revokeObjectURL(url);
    if (currentAudio === audio) currentAudio = null;
  }
}

export function stopDeapiAudio(): void {
  currentAudio?.pause();
  currentAudio = null;
}

/**
 * Push-to-talk recorder: start(), then stop() resolves with the audio.
 * cancel() ends any in-flight or pending capture — tracks stopped, chunks
 * discarded — so a cancelled call can never leak its recording into another.
 */
export class Recorder {
  private rec: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private generation = 0;
  private pending: ((b: Blob | null) => void) | null = null;

  static supported(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
  }

  get recording(): boolean {
    return this.rec?.state === 'recording';
  }

  async start(): Promise<void> {
    const gen = ++this.generation;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (gen !== this.generation) {
      stream.getTracks().forEach((t) => t.stop());
      throw new DeapiError('Recording cancelled.');
    }
    this.stream = stream;
    this.chunks = [];
    const rec = new MediaRecorder(stream);
    this.rec = rec;
    rec.ondataavailable = (e) => {
      if (e.data.size) this.chunks.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(this.chunks, { type: rec.mimeType || 'audio/webm' });
      this.teardown();
      const pending = this.pending;
      this.pending = null;
      pending?.(blob);
    };
    rec.start();
  }

  stop(): Promise<Blob> {
    const rec = this.rec;
    if (!rec || rec.state === 'inactive') return Promise.reject(new DeapiError('Not recording'));
    return new Promise((resolve, reject) => {
      this.pending = (b) => {
        if (b) resolve(b);
        else reject(new DeapiError('Recording cancelled.'));
      };
      rec.stop();
    });
  }

  cancel(): void {
    this.generation += 1;
    this.chunks = [];
    const rec = this.rec;
    const pending = this.pending;
    this.pending = null;
    if (rec && rec.state !== 'inactive') {
      try {
        rec.stop();
      } catch {
        // already stopping
      }
    }
    this.teardown();
    pending?.(null);
  }

  private teardown(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.rec = null;
  }
}


