import { afterEach, describe, expect, it, vi } from 'vitest';
import { Recorder } from '../src/voice/deapi';
import { MicSession } from '../src/voice/micSession';

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

function stubMedia(getUserMedia: () => Promise<FakeStream>): void {
  FakeRecorder.instances = [];
  vi.stubGlobal('MediaRecorder', FakeRecorder);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const yes = () => Promise.resolve(true);
const no = () => Promise.resolve(false);

describe('MicSession two-tap flow', () => {
  it('tap one starts recording, tap two stops it and returns the blob to upload', async () => {
    const stream = new FakeStream();
    stubMedia(async () => stream);
    const session = new MicSession(new Recorder(), yes, () => true);

    expect(await session.tap()).toEqual({ action: 'started' });
    expect(session.recording).toBe(true);

    const second = await session.tap();
    expect(second.action).toBe('transcribe');
    if (second.action === 'transcribe') expect(second.blob).toBeInstanceOf(Blob);
    expect(session.recording).toBe(false);
    expect(FakeRecorder.instances).toHaveLength(1);
    expect(stream.tracks.every((t) => t.stopped)).toBe(true);
  });

  it('a declined consent returns idle without touching the mic', async () => {
    let gumCalls = 0;
    stubMedia(async () => {
      gumCalls += 1;
      return new FakeStream();
    });
    const session = new MicSession(new Recorder(), no, () => true);
    expect(await session.tap()).toEqual({ action: 'idle' });
    expect(session.recording).toBe(false);
    expect(gumCalls).toBe(0);
    expect(FakeRecorder.instances).toHaveLength(0);
  });

  it('a call that ends during consent never starts recording', async () => {
    const stream = new FakeStream();
    stubMedia(async () => stream);
    let alive = true;
    const consent = () => {
      alive = false;
      return Promise.resolve(true);
    };
    const session = new MicSession(new Recorder(), consent, () => alive);
    expect(await session.tap()).toEqual({ action: 'idle' });
    expect(session.recording).toBe(false);
  });

  it('a call that ends while the mic opens cancels the fresh recording', async () => {
    const stream = new FakeStream();
    stubMedia(async () => stream);
    let aliveChecks = 0;
    const session = new MicSession(new Recorder(), yes, () => {
      aliveChecks += 1;
      return aliveChecks === 1;
    });
    expect(await session.tap()).toEqual({ action: 'idle' });
    expect(session.recording).toBe(false);
    expect(stream.tracks.every((t) => t.stopped)).toBe(true);
  });

  it('a tap after hang-up discards the recording instead of transcribing it', async () => {
    const stream = new FakeStream();
    stubMedia(async () => stream);
    let alive = true;
    const session = new MicSession(new Recorder(), yes, () => alive);

    expect(await session.tap()).toEqual({ action: 'started' });
    alive = false;
    expect(await session.tap()).toEqual({ action: 'idle' });
    expect(session.recording).toBe(false);
    expect(stream.tracks.every((t) => t.stopped)).toBe(true);
  });
});
