const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function formatRelativeTime(
  timestamp: number,
  now = Date.now(),
): string {
  const diff = Math.max(0, now - timestamp);
  if (diff < MINUTE_MS) return "just now";
  if (diff < HOUR_MS) {
    const m = Math.floor(diff / MINUTE_MS);
    return m === 1 ? "1 minute ago" : `${m} minutes ago`;
  }
  if (diff < DAY_MS) {
    const h = Math.floor(diff / HOUR_MS);
    return h === 1 ? "1 hour ago" : `${h} hours ago`;
  }
  const d = Math.floor(diff / DAY_MS);
  return d === 1 ? "1 day ago" : `${d} days ago`;
}
