import { Recorder } from './deapi';

export type MicTap = { action: 'started' } | { action: 'transcribe'; blob: Blob } | { action: 'idle' };

/**
 * Two-tap mic state machine for a deAPI recording: tap one starts recording,
 * tap two stops it and yields the blob for transcription. The session owns
 * its recorder for the whole call — cancel() is the single path every
 * hang-up/cleanup goes through, so a recording can never be orphaned.
 */
export class MicSession {
  private readonly recorder = new Recorder();

  constructor(
    private readonly consent: () => Promise<boolean>,
    private readonly alive: () => boolean,
  ) {}

  get recording(): boolean {
    return this.recorder.recording;
  }

  cancel(): void {
    this.recorder.cancel();
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
