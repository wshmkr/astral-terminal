// Serializes async work that contends on the same key (e.g. one settings file or WSL distro) by
// chaining each run after the previous one for that key, so concurrent callers don't race on the
// shared resource. Each caller owns the `locks` map, keeping its lock namespace separate.
export function withKeyedLock<T>(
  locks: Map<string, Promise<unknown>>,
  key: string,
  run: () => Promise<T>,
): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  const next = prev.then(run, run);
  locks.set(
    key,
    next.catch(() => {}),
  );
  return next;
}
