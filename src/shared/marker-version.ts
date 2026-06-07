// Installed hooks and the astral CLI tag themselves with a marker of the form `<prefix>:v<version>`,
// where the version is a dotted-decimal string (e.g. "4" or "0.10"). This reads that version back so
// an out-of-date install can be detected and replaced. The `:v<version>` format is the single source
// of truth for the marker convention shared across installers.
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

// Orders dotted-decimal versions numerically per segment ("0.2" < "0.10"), padding missing trailing
// segments with 0. Returns a sort-style sign: negative if a < b, 0 if equal, positive if a > b
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
