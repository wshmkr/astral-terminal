import fs from "node:fs";
import net from "node:net";
import { generateToken, verifyToken } from "./auth";
import {
  ensureSocketDir,
  resolveSocketPath,
  type SocketLocation,
  unlinkSocketIfExists,
} from "./path";
import {
  CLI_ERROR_CODES,
  type CliErrorCode,
  type CliReply,
  formatReply,
  makeErr,
  makeOk,
  parseRequest,
} from "./protocol";

const MAX_LINE_BYTES = 1024 * 1024;
const AUTH_HELLO_METHOD = "auth.hello";
// Unauthenticated TCP peers only ever need to send a tiny auth.hello line;
// bound what they can make us buffer and how long they can sit unauthenticated.
const PRE_AUTH_MAX_LINE_BYTES = 4 * 1024;
const PRE_AUTH_TIMEOUT_MS = 10_000;
const MAX_FAILED_AUTH_ATTEMPTS = 3;

export type CliMethodHandler = (params: unknown) => Promise<unknown> | unknown;

export class CliMethodError extends Error {
  constructor(
    readonly code: CliErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CliMethodError";
  }
}

export interface CliServer {
  start(): Promise<string>;
  close(): Promise<void>;
  register(method: string, handler: CliMethodHandler): void;
  getSocketPath(): string | null;
  getTcpPort(): number | null;
  getAuthToken(): string | null;
}

interface ConnectionContext {
  handlers: Map<string, CliMethodHandler>;
  // null => the transport itself is the access boundary (local socket / named pipe), so the
  // connection is pre-authenticated; a string => the client must pass it via auth.hello first.
  requiredToken: string | null;
}

function attachConnection(socket: net.Socket, ctx: ConnectionContext): void {
  let authed = ctx.requiredToken === null;
  let failedAuthAttempts = 0;
  // Accumulate chunks and only concat when a newline arrives, so a line
  // delivered in k chunks costs one copy instead of k quadratic re-copies.
  let chunks: Buffer[] = [];
  let buffered = 0;
  let overflowed = false;
  let dispatchChain = Promise.resolve();

  const authTimer = authed
    ? null
    : setTimeout(() => socket.destroy(), PRE_AUTH_TIMEOUT_MS);
  const maxLineBytes = () =>
    authed ? MAX_LINE_BYTES : PRE_AUTH_MAX_LINE_BYTES;

  const rejectOversize = () => {
    overflowed = true;
    chunks = [];
    buffered = 0;
    socket.write(
      formatReply(
        makeErr(null, CLI_ERROR_CODES.badEnvelope, "line exceeds limit"),
      ),
      () => socket.destroy(),
    );
  };
  socket.on("data", (chunk) => {
    if (overflowed) return;
    if (chunk.indexOf(0x0a) === -1) {
      chunks.push(chunk);
      buffered += chunk.length;
      if (buffered > maxLineBytes()) rejectOversize();
      return;
    }
    let buf = chunks.length > 0 ? Buffer.concat([...chunks, chunk]) : chunk;
    chunks = [];
    buffered = 0;
    while (true) {
      const nl = buf.indexOf(0x0a);
      if (nl === -1) {
        if (buf.length > maxLineBytes()) {
          rejectOversize();
          return;
        }
        break;
      }
      if (nl > maxLineBytes()) {
        rejectOversize();
        return;
      }
      const line = buf.subarray(0, nl).toString("utf8");
      buf = buf.subarray(nl + 1);
      if (line.trim().length === 0) continue;
      dispatchChain = dispatchChain
        .then(async () => {
          const wasAuthed = authed;
          const reply = await dispatch(line, ctx, {
            isAuthed: () => authed,
            markAuthed: () => {
              authed = true;
            },
          });
          if (!socket.destroyed) socket.write(formatReply(reply));
          if (authed && authTimer) clearTimeout(authTimer);
          if (!wasAuthed && !authed) {
            failedAuthAttempts += 1;
            if (failedAuthAttempts >= MAX_FAILED_AUTH_ATTEMPTS) {
              socket.destroy();
            }
          }
        })
        .catch(() => {
          // a failed dispatch/write must not stall later replies
        });
    }
    if (buf.length > 0) {
      chunks = [buf];
      buffered = buf.length;
    }
  });
  socket.on("close", () => {
    if (authTimer) clearTimeout(authTimer);
  });
  socket.on("error", () => {
    // ignore client-side errors
  });
}

function listenAsync(srv: net.Server, listen: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (err: Error) => {
      srv.off("listening", onListening);
      reject(err);
    };
    const onListening = () => {
      srv.off("error", onError);
      resolve();
    };
    srv.once("error", onError);
    srv.once("listening", onListening);
    listen();
  });
}

export function createCliServer(): CliServer {
  const handlers = new Map<string, CliMethodHandler>();
  let localServer: net.Server | null = null;
  let tcpServer: net.Server | null = null;
  let location: SocketLocation | null = null;
  let tcpPort: number | null = null;
  let authToken: string | null = null;
  let exitHookInstalled = false;

  const installExitHook = (): void => {
    if (exitHookInstalled) return;
    exitHookInstalled = true;
    process.on("exit", () => {
      if (location && !location.isPipe) {
        try {
          fs.unlinkSync(location.path);
        } catch {
          // best-effort
        }
      }
    });
  };

  return {
    register(method, handler) {
      handlers.set(method, handler);
    },
    getSocketPath() {
      return location?.path ?? null;
    },
    getTcpPort() {
      return tcpPort;
    },
    getAuthToken() {
      return authToken;
    },
    async start() {
      if (localServer) throw new Error("cli server already started");
      const loc = resolveSocketPath();
      if (loc.dir) ensureSocketDir(loc.dir);
      if (!loc.isPipe) unlinkSocketIfExists(loc.path);

      const local = net.createServer((socket) =>
        attachConnection(socket, { handlers, requiredToken: null }),
      );
      await listenAsync(local, () => local.listen(loc.path));

      if (!loc.isPipe) {
        try {
          fs.chmodSync(loc.path, 0o600);
        } catch {
          // chmod may not apply on all platforms; socket dir is already 0700
        }
      }

      localServer = local;
      location = loc;

      // TCP + token is the only transport reachable from inside WSL2 (the named pipe is not).
      // Binding 0.0.0.0 covers both default-NAT (the guest dials the host gateway) and mirrored
      // networking (the guest dials 127.0.0.1); the ephemeral port + per-run token are the
      // access control. Best-effort: a TCP bind failure must not take down the local socket.
      // TODO(native): native Linux/macOS shares the OS with the agent, so the local socket
      // above suffices and this listener can be skipped.
      if (process.platform === "win32") {
        try {
          const token = generateToken();
          const tcp = net.createServer((socket) =>
            attachConnection(socket, { handlers, requiredToken: token }),
          );
          await listenAsync(tcp, () => tcp.listen(0, "0.0.0.0"));
          const addr = tcp.address();
          tcpServer = tcp;
          tcpPort = typeof addr === "object" && addr ? addr.port : null;
          authToken = token;
          console.log(`[cli] tcp listening on 0.0.0.0:${tcpPort}`);
        } catch (err) {
          console.error("[cli] tcp listen failed", err);
        }
      }

      installExitHook();
      console.log(`[cli] listening on ${loc.path}`);
      return loc.path;
    },
    async close() {
      const local = localServer;
      const tcp = tcpServer;
      const loc = location;
      localServer = null;
      tcpServer = null;
      tcpPort = null;
      authToken = null;
      location = null;
      const closes: Promise<void>[] = [];
      if (local) closes.push(new Promise((r) => local.close(() => r())));
      if (tcp) closes.push(new Promise((r) => tcp.close(() => r())));
      await Promise.all(closes);
      if (loc && !loc.isPipe) unlinkSocketIfExists(loc.path);
    },
  };
}

interface AuthState {
  isAuthed(): boolean;
  markAuthed(): void;
}

async function dispatch(
  line: string,
  ctx: ConnectionContext,
  auth: AuthState,
): Promise<CliReply> {
  const parsed = parseRequest(line);
  if (!parsed.ok) return makeErr(parsed.id, parsed.code, parsed.message);
  const { id, method, params } = parsed.req;

  if (method === AUTH_HELLO_METHOD) {
    if (ctx.requiredToken === null) return makeOk(id, { authenticated: true });
    const token = readToken(params);
    if (token !== null && verifyToken(token, ctx.requiredToken)) {
      auth.markAuthed();
      return makeOk(id, { authenticated: true });
    }
    return makeErr(id, CLI_ERROR_CODES.unauthorized, "invalid token");
  }

  if (!auth.isAuthed()) {
    return makeErr(
      id,
      CLI_ERROR_CODES.unauthorized,
      "authenticate with auth.hello before calling methods",
    );
  }

  const handler = ctx.handlers.get(method);
  if (!handler) {
    return makeErr(
      id,
      CLI_ERROR_CODES.unknownMethod,
      `unknown method: ${method}`,
    );
  }
  try {
    const result = await handler(params);
    return makeOk(id, result ?? null);
  } catch (err) {
    if (err instanceof CliMethodError) {
      return makeErr(id, err.code, err.message);
    }
    const message = err instanceof Error ? err.message : String(err);
    return makeErr(id, CLI_ERROR_CODES.internalError, message);
  }
}

function readToken(params: unknown): string | null {
  if (params && typeof params === "object" && !Array.isArray(params)) {
    const token = (params as Record<string, unknown>).token;
    if (typeof token === "string") return token;
  }
  return null;
}

let singleton: CliServer | null = null;

export function getCliServer(): CliServer {
  singleton ??= createCliServer();
  return singleton;
}
