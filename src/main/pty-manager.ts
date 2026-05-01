import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SerializeAddon } from "@xterm/addon-serialize";
import { Terminal as HeadlessTerminal } from "@xterm/headless";
import type { IPty } from "node-pty";
import * as pty from "node-pty";
import { findAgentProvider } from "../shared/agent-hooks";
import { APP_PACKAGE_NAME } from "../shared/meta";
import { windowsPtyOptions } from "../shared/pty-options";
import { type AppConfig, DEFAULT_CWD } from "../shared/types";
import {
  AGENT_SESSION_OSC_IDENT,
  type AgentSession,
  parseAgentSessionOsc,
  resumeCommandFor,
} from "./agent-hooks/osc";

const HEADLESS_SCROLLBACK = 10000;
const SERIALIZE_SCROLLBACK = 5000;
const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;

const SERIALIZE_OPTS = {
  scrollback: SERIALIZE_SCROLLBACK,
  excludeAltBuffer: true,
};

const MAX_SURFACE_ID_LEN = 128;
const SURFACE_ID_PATTERN = /^[A-Za-z0-9_.-]+$/;

interface StoredBuffer {
  cols: number;
  rows: number;
  content: string;
}

function isStoredBuffer(v: unknown): v is StoredBuffer {
  if (!v || typeof v !== "object") return false;
  const { cols, rows, content } = v as Record<string, unknown>;
  return (
    typeof cols === "number" &&
    Number.isInteger(cols) &&
    cols > 0 &&
    typeof rows === "number" &&
    Number.isInteger(rows) &&
    rows > 0 &&
    typeof content === "string"
  );
}

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

function buildShellArgs(opts: {
  isWindows: boolean;
  wslCwd: string;
  startupCommand: string | undefined;
}): string[] {
  const { isWindows, wslCwd, startupCommand } = opts;
  // biome-ignore lint/suspicious/noTemplateCurlyInString: POSIX shell parameter expansion
  const sh = '"${SHELL:-/bin/sh}"';
  const inner = startupCommand
    ? `exec ${sh} -lic '${startupCommand.replace(/'/g, "'\\''")}; exec ${sh}'`
    : `exec ${sh} -l`;
  if (isWindows) return ["--cd", wslCwd, "-e", "sh", "-c", inner];
  return ["-c", inner];
}

export interface PtyCallbacks {
  onData?: (data: string) => void;
  onExit?: (exitCode: number, signal?: number) => void;
  onAgentCwd?: (cwd: string) => void;
}

export interface CreatePtyOptions {
  surfaceId: string;
  cwd?: string;
  cols?: number;
  rows?: number;
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
  // First beginReplay should skip redundant serialize()
  initialReplay: { cols: number; rows: number; content: string } | null;
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
    return path.join(this.bufferDir, `${surfaceId}.json`);
  }

  private metaFile(surfaceId: string): string {
    return path.join(this.bufferDir, `${surfaceId}.meta.json`);
  }

  private async loadBuffer(surfaceId: string): Promise<StoredBuffer | null> {
    const file = this.bufferFile(surfaceId);
    let raw: string;
    try {
      raw = await fs.promises.readFile(file, "utf-8");
    } catch {
      return null;
    }
    try {
      const parsed = JSON.parse(raw);
      if (isStoredBuffer(parsed)) return parsed;
      console.error("Terminal buffer has unexpected shape:", file);
    } catch (err) {
      console.error("Failed to parse terminal buffer:", file, err);
    }
    return null;
  }

  private writeBuffer(surfaceId: string, buf: StoredBuffer): void {
    try {
      fs.writeFileSync(this.bufferFile(surfaceId), JSON.stringify(buf));
    } catch (err) {
      console.error("Failed to write terminal buffer:", err);
    }
  }

  private deleteBuffer(surfaceId: string): void {
    try {
      fs.unlinkSync(this.bufferFile(surfaceId));
    } catch {}
  }

  private async loadAndConsumeAgentSession(
    surfaceId: string,
  ): Promise<AgentSession | undefined> {
    try {
      const raw = await fs.promises.readFile(this.metaFile(surfaceId), "utf-8");
      const parsed = JSON.parse(raw) as {
        agentName?: unknown;
        sessionId?: unknown;
        cwd?: unknown;
      };
      if (typeof parsed?.agentName !== "string") return undefined;
      if (typeof parsed.sessionId !== "string") return undefined;
      const cwd = typeof parsed.cwd === "string" ? parsed.cwd : undefined;
      return {
        agentName: parsed.agentName,
        sessionId: parsed.sessionId,
        cwd,
      };
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

  private snapshot(entry: PtyEntry): StoredBuffer {
    return {
      cols: entry.headless.cols,
      rows: entry.headless.rows,
      content: entry.serializeAddon.serialize(SERIALIZE_OPTS),
    };
  }

  async create(opts: CreatePtyOptions): Promise<string> {
    const { surfaceId, cwd, config } = opts;
    const id = randomUUID();
    const callbacks = opts.callbacks?.(id);
    const carried = this.evictBySurfaceId(surfaceId);
    const [restoredAgentSession, loadedBuffer] = await Promise.all([
      this.loadAndConsumeAgentSession(surfaceId),
      carried ? Promise.resolve(null) : this.loadBuffer(surfaceId),
    ]);

    // Skip scrollback restore when auto-resuming
    const restored = restoredAgentSession ? null : (carried ?? loadedBuffer);

    let targetCols: number;
    let targetRows: number;
    if (opts.cols && opts.cols > 0 && opts.rows && opts.rows > 0) {
      targetCols = Math.floor(opts.cols);
      targetRows = Math.floor(opts.rows);
    } else if (restored) {
      targetCols = restored.cols;
      targetRows = restored.rows;
    } else {
      targetCols = DEFAULT_COLS;
      targetRows = DEFAULT_ROWS;
    }

    const isWindows = process.platform === "win32";
    const shell = isWindows ? "wsl.exe" : "/bin/sh";
    const effectiveCwd = restoredAgentSession?.cwd ?? cwd;
    const wslCwd = effectiveCwd || DEFAULT_CWD;
    const args = buildShellArgs({
      isWindows,
      wslCwd,
      startupCommand: resumeCommandFor(restoredAgentSession),
    });

    const spawnCwd = isWindows ? os.homedir() : resolveCwd(effectiveCwd, false);

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
      cols: targetCols,
      rows: targetRows,
      cwd: spawnCwd,
      env,
    });

    const initialCols = restored?.cols ?? targetCols;
    const initialRows = restored?.rows ?? targetRows;
    const headless = new HeadlessTerminal({
      cols: initialCols,
      rows: initialRows,
      scrollback: HEADLESS_SCROLLBACK,
      allowProposedApi: true,
      windowsPty: windowsPtyOptions(config),
    });
    const serializeAddon = new SerializeAddon();
    headless.loadAddon(
      serializeAddon as unknown as import("@xterm/headless").ITerminalAddon,
    );

    if (restored) headless.write(restored.content);
    if (initialCols !== targetCols || initialRows !== targetRows) {
      headless.resize(targetCols, targetRows);
    }

    const entry: PtyEntry = {
      pty: proc,
      surfaceId,
      headless,
      serializeAddon,
      pendingForward: callbacks?.onData,
      agentSession: undefined,
      initialReplay: restored
        ? { cols: targetCols, rows: targetRows, content: restored.content }
        : null,
    };
    this.entries.set(id, entry);

    headless.parser.registerOscHandler(AGENT_SESSION_OSC_IDENT, (data) => {
      const parsed = parseAgentSessionOsc(data);
      if (!parsed) return false;
      const provider = findAgentProvider(parsed.agentName);
      if (!provider) return false;
      if (!provider.sessionIdPattern.test(parsed.sessionId)) return false;
      const { agentName, event, sessionId, cwd: parsedCwd } = parsed;
      if (event === "start") {
        // Launch cwd is where ~/.claude/projects/<encoded>/<sid>.jsonl lives;
        // EnterWorktree updates the per-message cwd but never moves the file,
        // so we freeze this for resume and only forward updates to the surface
        entry.agentSession = { agentName, sessionId, cwd: parsedCwd };
        this.writeMeta(entry.surfaceId, entry.agentSession);
        if (parsedCwd) callbacks?.onAgentCwd?.(parsedCwd);
      } else if (
        entry.agentSession?.agentName === agentName &&
        entry.agentSession.sessionId === sessionId
      ) {
        if (event === "update") {
          if (parsedCwd) callbacks?.onAgentCwd?.(parsedCwd);
        } else {
          entry.agentSession = undefined;
          this.deleteMeta(entry.surfaceId);
        }
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

  beginReplay(id: string): { cols: number; rows: number; content: string } {
    const entry = this.entries.get(id);
    if (!entry) return { cols: DEFAULT_COLS, rows: DEFAULT_ROWS, content: "" };
    const snap = entry.initialReplay ?? this.snapshot(entry);
    entry.initialReplay = null;
    if (entry.pendingForward) {
      entry.pty.onData(entry.pendingForward);
      entry.pendingForward = undefined;
    }
    return snap;
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

  private evictBySurfaceId(surfaceId: string): StoredBuffer | null {
    for (const [existingId, entry] of this.entries) {
      if (entry.surfaceId !== surfaceId) continue;
      const snap = this.snapshot(entry);
      this.teardown(existingId, { deleteBuffer: false });
      return snap;
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
        this.writeBuffer(entry.surfaceId, this.snapshot(entry));
      } catch (err) {
        console.error("Failed to serialize terminal buffer:", err);
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
      else if (name.endsWith(".json")) id = name.slice(0, -".json".length);
      if (!id || validSurfaceIds.has(id)) continue;
      try {
        fs.unlinkSync(path.join(this.bufferDir, name));
      } catch {}
    }
  }
}
