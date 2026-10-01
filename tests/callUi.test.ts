// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class FakeTrack {
  stopped = false;
  stop(): void {
    this.stopped = true;
  }
}

class FakeStream {
  tracks = [new FakeTrack()];
  getTracks(): FakeTrack[] {
    return this.tracks;
  }
}

class FakeRecorder {
  static instances: FakeRecorder[] = [];
  state: 'inactive' | 'recording' = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor() {
    FakeRecorder.instances.push(this);
  }
  start(): void {
    this.state = 'recording';
  }
  stop(): void {
    if (this.state === 'inactive') throw new Error('InvalidStateError');
    this.state = 'inactive';
    queueMicrotask(() => this.onstop?.());
  }
}

class FakeAudio {
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onpause: (() => void) | null = null;
  play(): Promise<void> {
    queueMicrotask(() => this.onended?.());
    return Promise.resolve();
  }
  pause(): void {
    queueMicrotask(() => this.onpause?.());
  }
}

class FakeAudioContext {
  currentTime = 0;
  destination = {};
  resume(): Promise<void> {
    return Promise.resolve();
  }
  createOscillator(): unknown {
    return { frequency: { value: 0 }, connect: (n: unknown) => n, start() {}, stop() {} };
  }
  createGain(): unknown {
    return { gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: (n: unknown) => n };
  }
}

let streams: FakeStream[];
let gum: () => Promise<FakeStream>;
let transcribeRespond: () => Promise<Response>;
let fetchCalls: string[];

const allStopped = () => streams.every((s) => s.tracks.every((t) => t.stopped));

beforeEach(async () => {
  streams = [];
  fetchCalls = [];
  FakeRecorder.instances = [];
  gum = async () => {
    const s = new FakeStream();
    streams.push(s);
    return s;
  };
  transcribeRespond = async () => Response.json({ text: 'Tell me more please' });
  vi.stubGlobal('MediaRecorder', FakeRecorder);
  vi.stubGlobal('Audio', FakeAudio);
  vi.stubGlobal('AudioContext', FakeAudioContext);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: () => gum() }, vibrate: () => {} });
  vi.stubGlobal('fetch', async (url: string | URL | Request) => {
    const u = String(url);
    fetchCalls.push(u);
    if (u.endsWith('/audio/speech')) return new Response(new Blob(['mp3']), { status: 200 });
    if (u.endsWith('/audio/transcriptions')) return transcribeRespond();
    return new Response('nope', { status: 404 });
  });
  Object.assign(URL, { createObjectURL: () => 'blob:fake', revokeObjectURL: () => {} });
  (Element.prototype as { scrollTo?: () => void }).scrollTo = function () {};
  localStorage.setItem('scd.settings.v1', JSON.stringify({ voice: 'deapi', coach: true, speed: 1, consent: { browser: true, deapi: true } }));
  sessionStorage.setItem('scd.deapiKey', 'k');
  document.body.innerHTML = '<div id="app"></div><div id="sr-live"></div>';
  vi.resetModules();
  await import('../src/main');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const app = () => document.getElementById('app') as HTMLElement;
const click = (sel: string) => (app().querySelector(sel) as HTMLElement | null)?.click();
const byText = (text: string) => [...app().querySelectorAll('button')].find((b) => b.textContent?.includes(text));
const mic = () => app().querySelector<HTMLButtonElement>('#mic');
const transcriptionCalls = () => fetchCalls.filter((u) => u.endsWith('/audio/transcriptions')).length;

async function startCall(): Promise<void> {
  byText('The Frozen Account')!.click();
  await sleep(1);
  click('#accept');
  await sleep(5);
}

async function typeSend(text: string): Promise<void> {
  (app().querySelector('#say') as HTMLInputElement).value = text;
  app().querySelector('#reply')!.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await sleep(5);
}

async function tapMic(): Promise<void> {
  mic()!.click();
  await sleep(350);
}

describe('call UI mic lifecycle (stubbed media + fetch)', () => {
  it('typed reply, then record, then hang up releases the mic', async () => {
    await startCall();
    await typeSend("I'll check with you");
    await tapMic();
    expect(streams).toHaveLength(1);
    expect(streams[0].tracks.every((t) => !t.stopped)).toBe(true);
    click('#hang');
    await sleep(5);
    expect(allStopped()).toBe(true);
    expect(transcriptionCalls()).toBe(0);
  });

  it('spoken reply, then record, then hang up and Back releases the mic', async () => {
    await startCall();
    await tapMic();
    await tapMic();
    expect(transcriptionCalls()).toBe(1);
    await tapMic();
    expect(streams).toHaveLength(2);
    click('#hang');
    await sleep(500);
    byText('Back to the dojo')!.click();
    await sleep(5);
    expect(allStopped()).toBe(true);
  });

  it('multiple record/send rounds then record then hang up releases every stream', async () => {
    await startCall();
    await typeSend('Tell me more');
    await tapMic();
    await tapMic();
    await typeSend('And then?');
    await tapMic();
    expect(streams.length).toBeGreaterThanOrEqual(2);
    click('#hang');
    await sleep(5);
    expect(allStopped()).toBe(true);
  });

  it('Retry then record then hang up releases the new stream too', async () => {
    await startCall();
    await tapMic();
    click('#hang');
    await sleep(500);
    byText('Retry this call')!.click();
    await sleep(5);
    click('#accept');
    await sleep(5);
    await tapMic();
    expect(streams.length).toBeGreaterThanOrEqual(2);
    click('#hang');
    await sleep(5);
    expect(allStopped()).toBe(true);
  });

  it('hanging up while mic permission is pending stops the granted stream', async () => {
    let grant: () => void = () => {};
    gum = () =>
      new Promise<FakeStream>((resolve) => {
        grant = () => {
          const s = new FakeStream();
          streams.push(s);
          resolve(s);
        };
      });
    await startCall();
    mic()!.click();
    await sleep(1);
    click('#hang');
    grant();
    await sleep(10);
    expect(allStopped()).toBe(true);
  });

  it('a transcription resolving after hang-up is discarded, not sent', async () => {
    let finishTranscribe: () => void = () => {};
    transcribeRespond = () =>
      new Promise<Response>((resolve) => {
        finishTranscribe = () => resolve(Response.json({ text: 'stale spoken words' }));
      });
    await startCall();
    await tapMic();
    await tapMic();
    click('#hang');
    finishTranscribe();
    await sleep(20);
    expect(app().innerHTML).not.toContain('stale spoken words');
    expect(transcriptionCalls()).toBe(1);
  });
});
