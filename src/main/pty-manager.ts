import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SerializeAddon } from "@xterm/addon-serialize";
import { Terminal as HeadlessTerminal } from "@xterm/headless";
import type { IPty } from "node-pty";
import * as pty from "node-pty";
import { findAgentProvider, resumeCommandFor } from "../shared/agent-hooks";
import {
  AGENT_SESSION_OSC_IDENT,
  type AgentSession,
  parseAgentSessionOsc,
} from "../shared/agent-session";
import { APP_PACKAGE_NAME } from "../shared/meta";
import { windowsPtyOptions } from "../shared/pty-options";
import { type AppConfig, DEFAULT_CWD } from "../shared/types";

const HEADLESS_SCROLLBACK = 10000;
const SERIALIZE_SCROLLBACK = 5000;

const SERIALIZE_OPTS = {
  scrollback: SERIALIZE_SCROLLBACK,
  excludeAltBuffer: true,
};

const MAX_SURFACE_ID_LEN = 128;
const SURFACE_ID_PATTERN = /^[A-Za-z0-9_.-]+$/;

function resolveCwd(raw: string | undefined, isWindows: boolean): string {
  const home = os.homedir();
  const fallback = isWindows ? home : process.env.HOME || "/home";
  if (!raw) return fallback;
  if (raw.startsWith("~/") || raw.startsWith("~\\")) {
    return path.join(home, raw.slice(2));
  }
  if (raw.startsWith("~")) return fallback;
  return raw;
}

// Run the startup command under the user's login+interactive shell so rc
// files (nvm / fnm / volta / etc.) set up PATH before it runs, then `exec`
// into a plain interactive shell so login profile isn't sourced twice.
// Avoids racing a timer against prompt readiness.
function buildShellArgs(opts: {
  isWindows: boolean;
  wslCwd: string;
  loginShellPath: string;
  startupCommand: string | undefined;
}): string[] {
  const { isWindows, wslCwd, loginShellPath, startupCommand } = opts;
  if (isWindows) {
    if (!startupCommand) {
      return ["--cd", wslCwd, "-e", "sh", "-c", 'exec "$SHELL" -l'];
    }
    const escaped = startupCommand.replace(/'/g, "'\\''");
    const inner = `${escaped}; exec "$SHELL"`;
    return ["--cd", wslCwd, "-e", "sh", "-c", `exec "$SHELL" -lic '${inner}'`];
  }
  if (!startupCommand) return ["-l"];
  return ["-lic", `${startupCommand}; exec ${loginShellPath}`];
}

export interface PtyCallbacks {
  onData?: (data: string) => void;
  onExit?: (exitCode: number, signal?: number) => void;
}

export interface CreatePtyOptions {
  surfaceId: string;
  cwd?: string;
  config: AppConfig;
  callbacks?: (id: string) => PtyCallbacks;
}

interface PtyEntry {
  pty: IPty;
  surfaceId: string;
  headless: HeadlessTerminal;
  serializeAddon: SerializeAddon;
  pendingForward: ((data: string) => void) | undefined;
  agentSession: AgentSession | undefined;
}

export class PtyManager {
  private entries = new Map<string, PtyEntry>();
  private bufferDir: string;

  constructor(bufferDir: string) {
    this.bufferDir = bufferDir;
    try {
      fs.mkdirSync(bufferDir, { recursive: true });
    } catch (err) {
      console.error("Failed to create terminal-buffers dir:", err);
    }
  }

  static isValidSurfaceId(id: unknown): id is string {
    return (
      typeof id === "string" &&
      id.length > 0 &&
      id.length <= MAX_SURFACE_ID_LEN &&
      SURFACE_ID_PATTERN.test(id)
    );
  }

  private bufferFile(surfaceId: string): string {
    return path.join(this.bufferDir, `${surfaceId}.txt`);
  }

  private metaFile(surfaceId: string): string {
    return path.join(this.bufferDir, `${surfaceId}.meta.json`);
  }

  private loadBuffer(surfaceId: string): string | null {
    try {
      return fs.readFileSync(this.bufferFile(surfaceId), "utf-8");
    } catch {
      return null;
    }
  }

  private writeBuffer(surfaceId: string, data: string): void {
    try {
      fs.writeFileSync(this.bufferFile(surfaceId), data);
    } catch (err) {
      console.error("Failed to write terminal buffer:", err);
    }
  }

  private deleteBuffer(surfaceId: string): void {
    try {
      fs.unlinkSync(this.bufferFile(surfaceId));
    } catch {}
  }

  // Single-shot: a crash before the agent re-emits `start` must not resume
  // the same dead session on the next boot.
  private loadAndConsumeAgentSession(
    surfaceId: string,
  ): AgentSession | undefined {
    try {
      const raw = fs.readFileSync(this.metaFile(surfaceId), "utf-8");
      const parsed = JSON.parse(raw) as {
        agentName?: unknown;
        sessionId?: unknown;
      };
      if (typeof parsed?.agentName !== "string") return undefined;
      if (typeof parsed.sessionId !== "string") return undefined;
      return { agentName: parsed.agentName, sessionId: parsed.sessionId };
    } catch {
      return undefined;
    } finally {
      this.deleteMeta(surfaceId);
    }
  }

  private writeMeta(surfaceId: string, session: AgentSession): void {
    try {
      fs.writeFileSync(this.metaFile(surfaceId), JSON.stringify(session));
    } catch (err) {
      console.error("Failed to write terminal meta:", err);
    }
  }

  private deleteMeta(surfaceId: string): void {
    try {
      fs.unlinkSync(this.metaFile(surfaceId));
    } catch {}
  }

  private serialize(entry: PtyEntry): string {
    return entry.serializeAddon.serialize(SERIALIZE_OPTS);
  }

  create(opts: CreatePtyOptions): string {
    const { surfaceId, cwd, config } = opts;
    const id = randomUUID();
    const callbacks = opts.callbacks?.(id);
    const carriedScrollback = this.evictBySurfaceId(surfaceId);
    const restoredAgentSession = this.loadAndConsumeAgentSession(surfaceId);
    const isWindows = process.platform === "win32";

    const shell = isWindows ? "wsl.exe" : process.env.SHELL || "/bin/bash";
    const wslCwd = cwd || DEFAULT_CWD;
    const args = buildShellArgs({
      isWindows,
      wslCwd,
      loginShellPath: shell,
      startupCommand: resumeCommandFor(restoredAgentSession),
    });

    const spawnCwd = isWindows ? os.homedir() : resolveCwd(cwd, false);

    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      TERM_PROGRAM: APP_PACKAGE_NAME,
    };
    if (isWindows) {
      env.WSLENV = process.env.WSLENV
        ? `${process.env.WSLENV}:TERM_PROGRAM/u`
        : "TERM_PROGRAM/u";
    }

    const proc = pty.spawn(shell, args, {
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      cwd: spawnCwd,
      env,
    });

    const headless = new HeadlessTerminal({
      cols: 80,
      rows: 24,
      scrollback: HEADLESS_SCROLLBACK,
      allowProposedApi: true,
      windowsPty: windowsPtyOptions(config),
    });
    const serializeAddon = new SerializeAddon();
    headless.loadAddon(
      serializeAddon as unknown as import("@xterm/headless").ITerminalAddon,
    );

    const restored = carriedScrollback ?? this.loadBuffer(surfaceId);
    if (restored) headless.write(restored);

    const entry: PtyEntry = {
      pty: proc,
      surfaceId,
      headless,
      serializeAddon,
      pendingForward: callbacks?.onData,
      agentSession: undefined,
    };
    this.entries.set(id, entry);

    headless.parser.registerOscHandler(AGENT_SESSION_OSC_IDENT, (data) => {
      const parsed = parseAgentSessionOsc(data);
      if (!parsed) return false;
      const provider = findAgentProvider(parsed.agentName);
      if (!provider) return false;
      if (!provider.sessionIdPattern.test(parsed.sessionId)) return false;
      const { agentName, event, sessionId } = parsed;
      if (event === "start") {
        entry.agentSession = { agentName, sessionId };
      } else if (
        entry.agentSession?.agentName === agentName &&
        entry.agentSession.sessionId === sessionId
      ) {
        entry.agentSession = undefined;
      }
      return true;
    });

    proc.onData((data) => headless.write(data));
    proc.onExit(({ exitCode, signal }) => {
      this.teardown(id, { deleteBuffer: true });
      callbacks?.onExit?.(exitCode, signal);
    });

    return id;
  }

  beginReplay(id: string): string {
    const entry = this.entries.get(id);
    if (!entry) return "";
    const buf = this.serialize(entry);
    if (entry.pendingForward) {
      entry.pty.onData(entry.pendingForward);
      entry.pendingForward = undefined;
    }
    return buf;
  }

  write(id: string, data: string): void {
    this.entries.get(id)?.pty.write(data);
  }

  resize(id: string, cols: number, rows: number): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.pty.resize(cols, rows);
    entry.headless.resize(cols, rows);
  }

  kill(id: string): void {
    this.teardown(id, { deleteBuffer: true });
  }

  private evictBySurfaceId(surfaceId: string): string | null {
    for (const [existingId, entry] of this.entries) {
      if (entry.surfaceId !== surfaceId) continue;
      const scrollback = this.serialize(entry);
      this.teardown(existingId, { deleteBuffer: false });
      return scrollback;
    }
    return null;
  }

  private teardown(
    id: string,
    { deleteBuffer }: { deleteBuffer: boolean },
  ): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    this.entries.delete(id);
    if (deleteBuffer) {
      this.deleteBuffer(entry.surfaceId);
      this.deleteMeta(entry.surfaceId);
    }
    try {
      entry.pty.kill();
    } catch {}
    entry.serializeAddon.dispose();
    entry.headless.dispose();
  }

  saveAndKillAll(): void {
    for (const [id, entry] of this.entries) {
      try {
        this.writeBuffer(entry.surfaceId, this.serialize(entry));
      } catch (err) {
        console.error("Failed to serialize terminal buffer:", err);
      }
      if (entry.agentSession) {
        this.writeMeta(entry.surfaceId, entry.agentSession);
      } else {
        this.deleteMeta(entry.surfaceId);
      }
      this.teardown(id, { deleteBuffer: false });
    }
  }

  pruneBuffers(validSurfaceIds: Set<string>): void {
    let entries: string[];
    try {
      entries = fs.readdirSync(this.bufferDir);
    } catch {
      return;
    }
    for (const name of entries) {
      let id: string | null = null;
      if (name.endsWith(".meta.json")) id = name.slice(0, -".meta.json".length);
      else if (name.endsWith(".txt")) id = name.slice(0, -".txt".length);
      if (!id || validSurfaceIds.has(id)) continue;
      try {
        fs.unlinkSync(path.join(this.bufferDir, name));
      } catch {}
    }
  }
}
