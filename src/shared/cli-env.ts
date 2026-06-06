// Environment variables Astral injects into every shell it spawns, so a process running inside
// the terminal (a script, or an agent like Claude Code) can identify itself and later reach the
// running app without having to discover anything. These names are the contract shared between
// the main-process injector and the `astral` CLI that reads them.
export const ASTRAL_ENV = {
  surfaceId: "ASTRAL_SURFACE_ID",
  pid: "ASTRAL_PID",
  version: "ASTRAL_VERSION",
  port: "ASTRAL_PORT",
  token: "ASTRAL_TOKEN",
  sock: "ASTRAL_SOCK",
} as const;

export type AstralEnvName = (typeof ASTRAL_ENV)[keyof typeof ASTRAL_ENV];

// WSLENV lists which Windows env vars wsl.exe forwards into the WSL guest. The `/u` flag passes
// the value through verbatim with no Win32<->WSL path translation, which is what opaque ids,
// ports, and tokens need (only path-valued vars would use `/p` or `/l`).
// TODO(native): non-Windows shells inherit these directly, so native injection skips WSLENV.
export function buildWslenvFragment(names: readonly AstralEnvName[]): string {
  return names.map((name) => `${name}/u`).join(":");
}
