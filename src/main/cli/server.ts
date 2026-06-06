import fs from "node:fs";
import net from "node:net";
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
}

export function createCliServer(): CliServer {
  const handlers = new Map<string, CliMethodHandler>();
  let server: net.Server | null = null;
  let location: SocketLocation | null = null;
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
    async start() {
      if (server) throw new Error("cli server already started");
      const loc = resolveSocketPath();
      if (loc.dir) ensureSocketDir(loc.dir);
      if (!loc.isPipe) unlinkSocketIfExists(loc.path);

      const srv = net.createServer((socket) => {
        let buf = Buffer.alloc(0);
        let overflowed = false;
        const rejectOversize = () => {
          overflowed = true;
          buf = Buffer.alloc(0);
          socket.write(
            formatReply(
              makeErr(null, CLI_ERROR_CODES.badEnvelope, "line exceeds 1 MiB"),
            ),
            () => socket.destroy(),
          );
        };
        socket.on("data", (chunk) => {
          if (overflowed) return;
          buf = Buffer.concat([buf, chunk]);
          while (true) {
            const nl = buf.indexOf(0x0a);
            if (nl === -1) {
              if (buf.length > MAX_LINE_BYTES) rejectOversize();
              break;
            }
            if (nl > MAX_LINE_BYTES) {
              rejectOversize();
              break;
            }
            const line = buf.subarray(0, nl).toString("utf8");
            buf = buf.subarray(nl + 1);
            if (line.trim().length === 0) continue;
            void dispatch(line, handlers).then((reply) => {
              if (!socket.destroyed) socket.write(formatReply(reply));
            });
          }
        });
        socket.on("error", () => {
          // ignore client-side errors
        });
      });

      await new Promise<void>((resolve, reject) => {
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
        srv.listen(loc.path);
      });

      if (!loc.isPipe) {
        try {
          fs.chmodSync(loc.path, 0o600);
        } catch {
          // chmod may not apply on all platforms; socket dir is already 0700
        }
      }

      server = srv;
      location = loc;
      installExitHook();
      console.log(`[cli] listening on ${loc.path}`);
      return loc.path;
    },
    async close() {
      const srv = server;
      const loc = location;
      server = null;
      location = null;
      if (!srv) return;
      await new Promise<void>((resolve) => {
        srv.close(() => resolve());
      });
      if (loc && !loc.isPipe) unlinkSocketIfExists(loc.path);
    },
  };
}

async function dispatch(
  line: string,
  handlers: Map<string, CliMethodHandler>,
): Promise<CliReply> {
  const parsed = parseRequest(line);
  if (!parsed.ok) return makeErr(parsed.id, parsed.code, parsed.message);
  const { id, method, params } = parsed.req;
  const handler = handlers.get(method);
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

let singleton: CliServer | null = null;

export function getCliServer(): CliServer {
  singleton ??= createCliServer();
  return singleton;
}
