import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SerializeAddon } from "@xterm/addon-serialize";
import { Terminal as HeadlessTerminal } from "@xterm/headless";
import type { IPty } from "node-pty";
import * as pty from "node-pty";
import {
  CLAUDE_SESSION_OSC_IDENT,
  CLAUDE_SESSION_OSC_PREFIX,
} from "../shared/agent-hooks";
import { APP_PACKAGE_NAME } from "../shared/meta";
import { windowsPtyOptions } from "../shared/pty-options";
import {
  type AppConfig,
  type CreatePtyResult,
  DEFAULT_CWD,
} from "../shared/types";

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
  claudeSessionId: string | undefined;
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

  private loadAndConsumeMeta(
    surfaceId: string,
  ): { claudeSessionId?: string } | null {
    let parsed: { claudeSessionId?: string } | null = null;
    try {
      const raw = fs.readFileSync(this.metaFile(surfaceId), "utf-8");
      const obj = JSON.parse(raw);
      if (obj && typeof obj === "object") {
        const id = (obj as { claudeSessionId?: unknown }).claudeSessionId;
        parsed = typeof id === "string" ? { claudeSessionId: id } : {};
      }
    } catch {
      parsed = null;
    }
    this.deleteMeta(surfaceId);
    return parsed;
  }

  private writeMeta(
    surfaceId: string,
    meta: { claudeSessionId?: string },
  ): void {
    try {
      fs.writeFileSync(this.metaFile(surfaceId), JSON.stringify(meta));
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

  create(opts: CreatePtyOptions): CreatePtyResult {
    const { surfaceId, cwd, config } = opts;
    const id = randomUUID();
    const callbacks = opts.callbacks?.(id);
    const carriedScrollback = this.evictBySurfaceId(surfaceId);
    const persistedMeta = this.loadAndConsumeMeta(surfaceId);
    const isWindows = process.platform === "win32";

    const shell = isWindows ? "wsl.exe" : process.env.SHELL || "/bin/bash";
    const wslCwd = cwd || DEFAULT_CWD;
    const args = isWindows
      ? ["--cd", wslCwd, "-e", "sh", "-c", 'exec "$SHELL" -l']
      : ["-l"];

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
      claudeSessionId: undefined,
    };
    this.entries.set(id, entry);

    headless.parser.registerOscHandler(CLAUDE_SESSION_OSC_IDENT, (data) => {
      if (!data.startsWith(CLAUDE_SESSION_OSC_PREFIX)) return false;
      const payload = data.slice(CLAUDE_SESSION_OSC_PREFIX.length);
      const sep = payload.indexOf(";");
      if (sep < 0) return false;
      const event = payload.slice(0, sep);
      const sessionId = payload.slice(sep + 1);
      if (!sessionId) return false;
      if (event === "start") {
        entry.claudeSessionId = sessionId;
      } else if (event === "end" && entry.claudeSessionId === sessionId) {
        entry.claudeSessionId = undefined;
      }
      return true;
    });

    proc.onData((data) => headless.write(data));
    proc.onExit(({ exitCode, signal }) => {
      this.teardown(id, { deleteBuffer: true });
      callbacks?.onExit?.(exitCode, signal);
    });

    return { ptyId: id, claudeSessionId: persistedMeta?.claudeSessionId };
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
      if (entry.claudeSessionId) {
        this.writeMeta(entry.surfaceId, {
          claudeSessionId: entry.claudeSessionId,
        });
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
