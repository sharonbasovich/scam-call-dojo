import { afterEach, describe, expect, it, vi } from 'vitest';
import { canListenLocally, listenLocally, stopListening } from '../src/voice/local';

interface FakeResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

class FakeRecognition {
  static instances: FakeRecognition[] = [];
  lang = '';
  interimResults = false;
  maxAlternatives = 1;
  onresult: ((e: FakeResultEvent) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  started = false;
  aborted = false;
  constructor() {
    FakeRecognition.instances.push(this);
  }
  start(): void {
    this.started = true;
  }
  stop(): void {
    this.onend?.();
  }
  abort(): void {
    this.aborted = true;
    this.onerror?.({ error: 'aborted' });
    this.onend?.();
  }
  say(text: string): void {
    this.onresult?.({ results: [[{ transcript: text }]] });
    this.onend?.();
  }
}

function stubWindow(): void {
  FakeRecognition.instances = [];
  vi.stubGlobal('window', { SpeechRecognition: FakeRecognition });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('browser dictation lifecycle (mocked SpeechRecognition)', () => {
  it('is unavailable when the browser exposes no recogniser', () => {
    vi.stubGlobal('window', {});
    expect(canListenLocally()).toBe(false);
  });

  it('starts recognition and resolves the transcript', async () => {
    stubWindow();
    const p = listenLocally();
    const rec = FakeRecognition.instances[0];
    expect(rec.started).toBe(true);
    rec.say('no way, goodbye');
    await expect(p).resolves.toBe('no way, goodbye');
  });

  it('resolves empty (not an error) when aborted, so no stale transcript is submitted', async () => {
    stubWindow();
    const p = listenLocally();
    const rec = FakeRecognition.instances[0];
    stopListening();
    expect(rec.aborted).toBe(true);
    await expect(p).resolves.toBe('');
  });

  it('resolves empty on no-speech instead of surfacing an error', async () => {
    stubWindow();
    const p = listenLocally();
    const rec = FakeRecognition.instances[0];
    rec.onerror?.({ error: 'no-speech' });
    rec.onend?.();
    await expect(p).resolves.toBe('');
  });

  it('aborts a previous dictation before starting a new one', async () => {
    stubWindow();
    void listenLocally();
    void listenLocally();
    expect(FakeRecognition.instances).toHaveLength(2);
    expect(FakeRecognition.instances[0].aborted).toBe(true);
    FakeRecognition.instances[1].say('check with my bank');
  });

  it('rejects when the mic permission is denied', async () => {
    stubWindow();
    const p = listenLocally();
    FakeRecognition.instances[0].onerror?.({ error: 'not-allowed' });
    await expect(p).rejects.toThrow('Microphone permission was denied.');
  });
});
