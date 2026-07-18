// Single-flight async caches that never memoize a rejection: a transient
// failure must not permanently poison the cache for every later caller.

export function singleFlight<T>(load: () => Promise<T>): () => Promise<T> {
  let inflight: Promise<T> | null = null;
  return () => {
    inflight ??= load().catch((err) => {
      inflight = null;
      throw err;
    });
    return inflight;
  };
}

export function keyedSingleFlight<A extends unknown[], T>(
  keyOf: (...args: A) => string,
  load: (...args: A) => Promise<T>,
): (...args: A) => Promise<T> {
  const cache = new Map<string, Promise<T>>();
  return (...args) => {
    const key = keyOf(...args);
    let entry = cache.get(key);
    if (!entry) {
      const created: Promise<T> = load(...args).catch((err) => {
        if (cache.get(key) === created) cache.delete(key);
        throw err;
      });
      cache.set(key, created);
      entry = created;
    }
    return entry;
  };
}
