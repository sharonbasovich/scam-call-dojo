import { Recorder } from './deapi';

export type MicTap = { action: 'started' } | { action: 'transcribe'; blob: Blob } | { action: 'idle' };

/**
 * Two-tap mic state machine for a deAPI recording: tap one starts recording,
 * tap two stops it and yields the blob for transcription. Cancelling on
 * hang-up or call cleanup is a separate path — a tap never discards an
 * active recording.
 */
export class MicSession {
  constructor(
    private readonly recorder: Recorder,
    private readonly consent: () => Promise<boolean>,
    private readonly alive: () => boolean,
  ) {}

  get recording(): boolean {
    return this.recorder.recording;
  }

  async tap(): Promise<MicTap> {
    if (!this.recorder.recording) {
      if (!(await this.consent()) || !this.alive()) return { action: 'idle' };
      await this.recorder.start();
      if (!this.alive()) {
        this.recorder.cancel();
        return { action: 'idle' };
      }
      return { action: 'started' };
    }
    if (!this.alive()) {
      this.recorder.cancel();
      return { action: 'idle' };
    }
    return { action: 'transcribe', blob: await this.recorder.stop() };
  }
}
