import type { z } from "zod";
import type {
  ActiveRef,
  CliRendererErrorCode,
  CliRendererReply,
  CliRendererRequest,
} from "../../shared/types";
import { findLeafPane } from "../components/Layout/pane-tree";
import { getActiveWorkspace, getState, subscribeWorkspaceStore } from "./core";

function readActiveRef(): ActiveRef {
  const s = getState();
  const ws = getActiveWorkspace();
  const paneId = s.focusedPaneId;
  const leaf = ws && paneId ? findLeafPane(ws.layout, paneId) : null;
  return {
    workspaceId: ws?.id ?? null,
    paneId: leaf?.id ?? null,
    surfaceId: leaf?.activeSurfaceId ?? null,
  };
}

function sameRef(a: ActiveRef, b: ActiveRef): boolean {
  return (
    a.workspaceId === b.workspaceId &&
    a.paneId === b.paneId &&
    a.surfaceId === b.surfaceId
  );
}

export type CliHandler = (params: unknown) => unknown;

export class CliHandlerError extends Error {
  constructor(
    readonly code: CliRendererErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CliHandlerError";
  }
}

const handlers = new Map<string, CliHandler>();

export function registerCliHandler(method: string, handler: CliHandler): void {
  handlers.set(method, handler);
}

export function parseCliParams<T>(schema: z.ZodType<T>, params: unknown): T {
  const result = schema.safeParse(params ?? {});
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const path = issue?.path.join(".");
  const message = issue?.message ?? "invalid params";
  throw new CliHandlerError(
    "invalid_params",
    path ? `${path}: ${message}` : message,
  );
}

async function handleRequest(
  request: CliRendererRequest,
): Promise<CliRendererReply> {
  const { requestId, method } = request;
  if (Date.now() >= request.deadline) {
    return {
      requestId,
      ok: false,
      code: "internal_error",
      message: `${method} request expired before the renderer handled it`,
    };
  }
  const handler = handlers.get(method);
  if (!handler) {
    return {
      requestId,
      ok: false,
      code: "unknown_method",
      message: `unknown method: ${method}`,
    };
  }
  try {
    const result = await handler(request.params);
    return { requestId, ok: true, result: result ?? null };
  } catch (err) {
    if (err instanceof CliHandlerError) {
      return { requestId, ok: false, code: err.code, message: err.message };
    }
    return {
      requestId,
      ok: false,
      code: "internal_error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

function startActiveRefSync(): void {
  let last = readActiveRef();
  window.app.sendCliActiveRef(last);
  subscribeWorkspaceStore(() => {
    const next = readActiveRef();
    if (sameRef(last, next)) return;
    last = next;
    window.app.sendCliActiveRef(next);
  });
}

let started = false;

export function startCliBridge(): void {
  if (started) return;
  if (typeof window === "undefined" || !window.app?.onCliRequest) return;
  started = true;
  startActiveRefSync();
  window.app.onCliRequest((request) => {
    void handleRequest(request).then((reply) => window.app.sendCliReply(reply));
  });
  window.app.sendCliHandlers([...handlers.keys()]);
}
