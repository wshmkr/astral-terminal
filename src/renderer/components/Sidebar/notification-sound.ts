let audioCtx: AudioContext | null = null;
let lastPlayTime = 0;
const DEBOUNCE_MS = 1500;

export function playNotificationSound(options: { enabled: boolean }): void {
  if (!options.enabled) return;

  const now = Date.now();
  if (now - lastPlayTime < DEBOUNCE_MS) return;
  lastPlayTime = now;

  if (!audioCtx) {
    audioCtx = new AudioContext();
  }

  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  const t = audioCtx.currentTime + 0.05;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.5, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  gain.connect(audioCtx.destination);

  const osc = audioCtx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 660;
  osc.connect(gain);
  osc.start(t);
  osc.stop(t + 0.15);
}
