export function arrayMove<T>(
  arr: readonly T[],
  from: number,
  to: number,
): T[] | null {
  if (from === to) return null;
  if (from < 0 || from >= arr.length) return null;
  if (to < 0 || to >= arr.length) return null;
  const next = arr.slice();
  const [moved] = next.splice(from, 1);
  if (!moved) return null;
  next.splice(to, 0, moved);
  return next;
}
