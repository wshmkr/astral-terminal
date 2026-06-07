// Installed hooks and the astral CLI tag themselves with a marker of the form `<prefix>:v<n>`.
// This reads that version back so an out-of-date install can be detected and replaced. The
// `:v<n>` format is the single source of truth for the marker convention shared across installers.
export function parseMarkerVersion(
  content: string,
  prefix: string,
): number | null {
  for (
    let i = content.indexOf(prefix);
    i >= 0;
    i = content.indexOf(prefix, i + 1)
  ) {
    const match = content.slice(i + prefix.length).match(/^:v(\d+)/);
    if (match) return Number(match[1]);
  }
  return null;
}
