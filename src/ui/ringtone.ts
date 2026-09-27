let ctx: AudioContext | null = null;
let timer: number | null = null;

function beep(ac: AudioContext, at: number): void {
  for (const freq of [440, 480]) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.06, at + 0.05);
    gain.gain.setValueAtTime(0.06, at + 1.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.3);
    osc.connect(gain).connect(ac.destination);
    osc.start(at);
    osc.stop(at + 1.35);
  }
}

export function startRing(): void {
  stopRing();
  try {
    ctx = ctx ?? new AudioContext();
    const ac = ctx;
    void ac.resume();
    beep(ac, ac.currentTime + 0.05);
    timer = window.setInterval(() => beep(ac, ac.currentTime + 0.05), 3000);
  } catch {
    // Audio unavailable; the visual ring still plays.
  }
  navigator.vibrate?.([400, 200, 400]);
}

export function stopRing(): void {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  navigator.vibrate?.(0);
}
