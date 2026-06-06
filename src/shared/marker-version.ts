// Installed hooks and the astral CLI tag themselves with a marker of the form `<prefix>:v<n>`.
// This reads that version back so an out-of-date install can be detected and replaced. The
// `:v<n>` format is the single source of truth for the marker convention shared across installers.
export function parseMarkerVersion(
  content: string,
  prefix: string,
): number | null {
  const i = content.indexOf(prefix);
  if (i < 0) return null;
  const match = content.slice(i + prefix.length).match(/^:v(\d+)/);
  return match ? Number(match[1]) : null;
}
