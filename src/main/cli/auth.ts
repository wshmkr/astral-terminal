import { randomBytes, timingSafeEqual } from "node:crypto";

// Per-run secret the WSL-facing TCP transport requires before any method. Kept in memory only,
// so it dies with the app and a fresh one is minted every launch.
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function verifyToken(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
