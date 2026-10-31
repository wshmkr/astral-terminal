import type { BrowserWindow, WebContents } from "electron";
import { ipcMain } from "electron";
import {
  type CliSplitDirection,
  type CliSplitReply,
  type CliSplitRequest,
  type CliSplitResult,
  IPC,
} from "../../../shared/types";
import { CLI_ERROR_CODES } from "../protocol";
import { CliMethodError, type CliServer } from "../server";

const SPLIT_DIRECTIONS: readonly CliSplitDirection[] = ["right", "down"];

// The renderer owns the layout, so the split round-trips through it. The renderer no-ops past
// REPLY_TIMEOUT_MS; the grace period lets a split that started just before the deadline reply.
const REPLY_TIMEOUT_MS = 5000;
const REPLY_GRACE_MS = 1000;

interface ParsedParams {
  direction: CliSplitDirection;
  surfaceId?: string;
  paneId?: string;
}

function isSplitDirection(value: unknown): value is CliSplitDirection {
  return (
    typeof value === "string" &&
    (SPLIT_DIRECTIONS as readonly string[]).includes(value)
  );
}

function parseParams(params: unknown): ParsedParams {
  if (typeof params !== "object" || params === null || Array.isArray(params)) {
    throw new CliMethodError(
      CLI_ERROR_CODES.invalidParams,
      'pane.split expects an object, e.g. {"direction":"right"}',
    );
  }
  const record = params as Record<string, unknown>;
  if (!isSplitDirection(record.direction)) {
    throw new CliMethodError(
      CLI_ERROR_CODES.invalidParams,
      `direction must be one of: ${SPLIT_DIRECTIONS.join(", ")}`,
    );
  }
  const parsed: ParsedParams = { direction: record.direction };
  if (record.surfaceId !== undefined) {
    if (typeof record.surfaceId !== "string") {
      throw new CliMethodError(
        CLI_ERROR_CODES.invalidParams,
        "surfaceId must be a string",
      );
    }
    parsed.surfaceId = record.surfaceId;
  }
  if (record.paneId !== undefined) {
    if (typeof record.paneId !== "string") {
      throw new CliMethodError(
        CLI_ERROR_CODES.invalidParams,
        "paneId must be a string",
      );
    }
    parsed.paneId = record.paneId;
  }
  return parsed;
}

function isReply(value: unknown): value is CliSplitReply {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.requestId === "string" &&
    typeof v.result === "object" &&
    v.result !== null
  );
}

export function registerPaneSplit(
  server: CliServer,
  getMainWindow: () => BrowserWindow | null,
): void {
  let nextRequestId = 0;
  const pending = new Map<
    string,
    {
      resolve: (result: CliSplitResult) => void;
      timer: NodeJS.Timeout;
      sender: WebContents;
    }
  >();

  ipcMain.on(IPC.cli.splitResult, (event, payload: unknown) => {
    if (!isReply(payload)) return;
    const entry = pending.get(payload.requestId);
    if (!entry || event.sender !== entry.sender) return;
    clearTimeout(entry.timer);
    pending.delete(payload.requestId);
    entry.resolve(payload.result);
  });

  server.register("pane.split", async (params) => {
    const parsed = parseParams(params);
    const win = getMainWindow();
    if (!win || win.isDestroyed()) {
      throw new CliMethodError(
        CLI_ERROR_CODES.internalError,
        "no application window is open",
      );
    }

    const requestId = `split-${nextRequestId++}`;
    const deadline = Date.now() + REPLY_TIMEOUT_MS;
    const request: CliSplitRequest = { requestId, deadline, ...parsed };
    const result = await new Promise<CliSplitResult>((resolve) => {
      const timer = setTimeout(() => {
        pending.delete(requestId);
        resolve({ ok: false, reason: "timed out waiting for the renderer" });
      }, REPLY_TIMEOUT_MS + REPLY_GRACE_MS);
      pending.set(requestId, { resolve, timer, sender: win.webContents });
      // the window can be torn down between the isDestroyed() check and this send
      try {
        win.webContents.send(IPC.cli.split, request);
      } catch (err) {
        clearTimeout(timer);
        pending.delete(requestId);
        resolve({
          ok: false,
          reason: `failed to dispatch split to renderer: ${String(err)}`,
        });
      }
    });

    if (!result.ok) {
      throw new CliMethodError(
        result.invalidParams
          ? CLI_ERROR_CODES.invalidParams
          : CLI_ERROR_CODES.internalError,
        result.reason ?? "split failed",
      );
    }
    return {
      workspaceId: result.workspaceId ?? null,
      paneId: result.paneId ?? null,
      surfaceId: result.surfaceId ?? null,
    };
  });
}
