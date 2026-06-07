// Serializes async runs that share a key, so they don't race
export function withKeyedLock<T>(
  locks: Map<string, Promise<unknown>>,
  key: string,
  run: () => Promise<T>,
): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  const next = prev.then(run, run);
  // Delete settled entries (unless superseded) to keep the map bounded
  const tail = next
    .catch(() => {})
    .finally(() => {
      if (locks.get(key) === tail) locks.delete(key);
    });
  locks.set(key, tail);
  return next;
}
