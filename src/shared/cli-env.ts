// Env vars Astral injects into spawned shells so inner processes can identify/reach the app
export const ASTRAL_ENV = {
  surfaceId: "ASTRAL_SURFACE_ID",
  pid: "ASTRAL_PID",
  version: "ASTRAL_VERSION",
} as const;

export type AstralEnvName = (typeof ASTRAL_ENV)[keyof typeof ASTRAL_ENV];

// WSLENV picks which env vars wsl.exe forwards; `/u` = pass verbatim, no path translation
// TODO(native): non-Windows shells inherit these directly, so native injection skips WSLENV
export function buildWslenvFragment(names: readonly AstralEnvName[]): string {
  return names.map((name) => `${name}/u`).join(":");
}
