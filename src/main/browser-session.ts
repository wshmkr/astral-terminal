import { type Session, session } from "electron";

const PARTITION = "persist:browser-default";

let cached: Session | null = null;

// The renderer's defaultSession has a strict CSP installed in installCsp().
// Browser surfaces need a separate session both to escape that CSP and to
// keep cookies/storage isolated from the app shell
export function getBrowserSession(): Session {
  if (!cached) cached = session.fromPartition(PARTITION);
  return cached;
}
