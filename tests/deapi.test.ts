import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEAPI_BASE, DeapiError, Recorder, deapiSpeech, deapiTranscribe } from '../src/voice/deapi';

type Call = { url: string; init: RequestInit };

function mockFetch(response: Response, calls: Call[]): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return response;
  }) as typeof fetch;
}

describe('deAPI adapter', () => {
  it('sends an OpenAI-compatible speech request with a preset Kokoro voice', async () => {
    const calls: Call[] = [];
    const blob = await deapiSpeech('k', 'hello', 'af_nova', 1, mockFetch(new Response(new Blob(['mp3']), { status: 200 }), calls));
    expect(blob.size).toBeGreaterThan(0);
    expect(calls[0].url).toBe(`${DEAPI_BASE}/audio/speech`);
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer k');
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ model: 'Kokoro', voice: 'af_nova', input: 'hello', response_format: 'mp3', speed: 1 });
  });

  it('uploads audio for transcription and returns text', async () => {
    const calls: Call[] = [];
    const text = await deapiTranscribe('k', new Blob(['x'], { type: 'audio/webm' }), mockFetch(Response.json({ text: ' no thanks ' }), calls));
    expect(text).toBe('no thanks');
    expect(calls[0].url).toBe(`${DEAPI_BASE}/audio/transcriptions`);
    const form = calls[0].init.body as FormData;
    expect(form.get('model')).toBe('WhisperLargeV3');
    expect(form.get('file')).toBeInstanceOf(Blob);
  });

  it('surfaces API error messages', async () => {
    const res = Response.json({ error: { message: 'Invalid token', code: 'unauthorized' } }, { status: 401 });
    await expect(deapiSpeech('bad', 'hi', 'af_nova', 1, mockFetch(res, []))).rejects.toThrow(DeapiError);
  });
});

// ---- Recorder lifecycle (mocked getUserMedia + MediaRecorder) ----

class FakeTrack {
  stopped = false;
  stop(): void {
    this.stopped = true;
  }
}

class FakeStream {
  tracks = [new FakeTrack(), new FakeTrack()];
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

function stubMedia(getUserMedia: () => Promise<FakeStream>): void {
  FakeRecorder.instances = [];
  vi.stubGlobal('MediaRecorder', FakeRecorder);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Recorder cancellation (mocked media)', () => {
  it('stop() resolves a blob and stops the tracks', async () => {
    const stream = new FakeStream();
    stubMedia(async () => stream);
    const rec = new Recorder();
    await rec.start();
    expect(rec.recording).toBe(true);
    const blob = await rec.stop();
    expect(blob.size).toBeGreaterThanOrEqual(0);
    expect(stream.tracks.every((t) => t.stopped)).toBe(true);
    expect(rec.recording).toBe(false);
  });

  it('cancel() stops tracks, clears the recorder and resolves a pending stop() as cancelled', async () => {
    const stream = new FakeStream();
    stubMedia(async () => stream);
    const rec = new Recorder();
    await rec.start();
    const p = rec.stop();
    rec.cancel();
    await expect(p).rejects.toThrow('cancelled');
    expect(stream.tracks.every((t) => t.stopped)).toBe(true);
    await expect(rec.stop()).rejects.toThrow('Not recording');
  });

  it('a getUserMedia resolving after cancel() stops the fresh tracks and rejects', async () => {
    const stream = new FakeStream();
    let resolveGum: (s: FakeStream) => void = () => {};
    stubMedia(
      () =>
        new Promise<FakeStream>((r) => {
          resolveGum = r;
        }),
    );
    const rec = new Recorder();
    const p = rec.start();
    rec.cancel();
    resolveGum(stream);
    await expect(p).rejects.toThrow('cancelled');
    expect(stream.tracks.every((t) => t.stopped)).toBe(true);
    expect(rec.recording).toBe(false);
  });

  it('a cancelled recorder cannot deliver chunks to a later stop()', async () => {
    const stream = new FakeStream();
    stubMedia(async () => stream);
    const rec = new Recorder();
    await rec.start();
    FakeRecorder.instances[0].ondataavailable?.({ data: new Blob(['old']) });
    rec.cancel();
    await expect(rec.stop()).rejects.toThrow('Not recording');
  });
});
