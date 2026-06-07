// Reads the version from a `<prefix>:v<version>` marker, or null
export function parseMarkerVersion(
  content: string,
  prefix: string,
): string | null {
  for (
    let i = content.indexOf(prefix);
    i >= 0;
    i = content.indexOf(prefix, i + 1)
  ) {
    const version = content
      .slice(i + prefix.length)
      .match(/^:v(\d+(?:\.\d+)*)/)?.[1];
    if (version !== undefined) return version;
  }
  return null;
}

// Orders dotted versions per segment, so "0.2" < "0.10"
export function compareVersions(a: string, b: string): number {
  const aSegments = a.split(".").map(Number);
  const bSegments = b.split(".").map(Number);
  const length = Math.max(aSegments.length, bSegments.length);
  for (let i = 0; i < length; i++) {
    const diff = (aSegments[i] ?? 0) - (bSegments[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
