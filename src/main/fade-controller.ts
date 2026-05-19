export interface FadeController {
  cancelPendingHide(): void;
  scheduleHide(onComplete: () => void): void;
}

export function createFadeController(durationMs: number): FadeController {
  let token = 0;
  return {
    cancelPendingHide() {
      ++token;
    },
    scheduleHide(onComplete) {
      const myToken = ++token;
      setTimeout(() => {
        if (myToken === token) onComplete();
      }, durationMs);
    },
  };
}
