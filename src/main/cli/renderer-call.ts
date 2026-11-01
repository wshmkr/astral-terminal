import type { BrowserWindow, WebContents } from "electron";
import { ipcMain } from "electron";
import type { ResolvedTarget, TargetParams } from "../../shared/cli/target";
import {
  type CliRendererReply,
  type CliRendererRequest,
  IPC,
} from "../../shared/types";
import { CLI_ERROR_CODES, isCliErrorCode } from "./protocol";
import { CliMethodError, type CliServer } from "./server";

const REPLY_TIMEOUT_MS = 5000;
// extra wait for a handler the renderer started before its deadline
const REPLY_GRACE_MS = 1000;

const FORWARDED_PREFIXES = ["workspace.", "pane.", "surface."];

export type RendererResultHook = (
  params: unknown,
  result: unknown,
) => Promise<void>;

type Settled =
  | { ok: true; result: unknown }
  | { ok: false; code: string; message: string };

interface PendingEntry {
  settle: (outcome: Settled) => void;
  sender: WebContents;
}

let getWindow: () => BrowserWindow | null = () => null;
let nextRequestId = 0;
let rendererMethods: string[] = [];
const pending = new Map<string, PendingEntry>();
const resultHooks = new Map<string, RendererResultHook[]>();

function isReply(value: unknown): value is CliRendererReply {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.requestId !== "string") return false;
  if (v.ok === true) return true;
  return (
    v.ok === false &&
    typeof v.code === "string" &&
    typeof v.message === "string"
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function isMainSender(sender: WebContents): boolean {
  const win = getWindow();
  return !!win && !win.isDestroyed() && win.webContents === sender;
}

export function getRendererMethods(): readonly string[] {
  return rendererMethods;
}

export function onRendererResult(
  method: string,
  hook: RendererResultHook,
): void {
  const hooks = resultHooks.get(method);
  if (hooks) hooks.push(hook);
  else resultHooks.set(method, [hook]);
}

export async function callRenderer(
  method: string,
  params: unknown,
): Promise<unknown> {
  const win = getWindow();
  if (!win || win.isDestroyed()) {
    throw new CliMethodError(
      CLI_ERROR_CODES.internalError,
      "no application window is open",
    );
  }

  const requestId = `cli-${nextRequestId++}`;
  const deadline = Date.now() + REPLY_TIMEOUT_MS;
  const request: CliRendererRequest = { requestId, method, params, deadline };
  const sender = win.webContents;
  const outcome = await new Promise<Settled>((resolve) => {
    const fail = (message: string) =>
      settle({ ok: false, code: CLI_ERROR_CODES.internalError, message });
    const onDestroyed = () => fail("the application window was closed");
    const timer = setTimeout(
      () => fail("timed out waiting for the renderer"),
      REPLY_TIMEOUT_MS + REPLY_GRACE_MS,
    );
    function settle(o: Settled) {
      clearTimeout(timer);
      sender.removeListener("destroyed", onDestroyed);
      pending.delete(requestId);
      resolve(o);
    }
    sender.once("destroyed", onDestroyed);
    pending.set(requestId, { settle, sender });
    try {
      sender.send(IPC.cli.request, request);
    } catch (err) {
      fail(`failed to dispatch ${method} to renderer: ${String(err)}`);
    }
  });

  if (!outcome.ok) {
    throw new CliMethodError(
      isCliErrorCode(outcome.code)
        ? outcome.code
        : CLI_ERROR_CODES.internalError,
      outcome.message,
    );
  }
  for (const hook of resultHooks.get(method) ?? []) {
    await hook(params, outcome.result);
  }
  return outcome.result;
}

export async function resolveSurface(
  params: TargetParams,
): Promise<ResolvedTarget> {
  return (await callRenderer("surface.resolve", params)) as ResolvedTarget;
}

export function registerRendererCall(
  server: CliServer,
  getMainWindow: () => BrowserWindow | null,
): void {
  getWindow = getMainWindow;

  ipcMain.on(IPC.cli.reply, (event, payload: unknown) => {
    if (!isReply(payload)) return;
    const entry = pending.get(payload.requestId);
    if (!entry || event.sender !== entry.sender) return;
    entry.settle(
      payload.ok
        ? { ok: true, result: payload.result ?? null }
        : { ok: false, code: payload.code, message: payload.message },
    );
  });

  ipcMain.on(IPC.cli.handlers, (event, payload: unknown) => {
    if (!isStringArray(payload) || !isMainSender(event.sender)) return;
    rendererMethods = [...payload];
  });

  server.setFallback((method, params) => {
    if (!FORWARDED_PREFIXES.some((prefix) => method.startsWith(prefix))) {
      throw new CliMethodError(
        CLI_ERROR_CODES.unknownMethod,
        `unknown method: ${method}`,
      );
    }
    return callRenderer(method, params);
  });
}
