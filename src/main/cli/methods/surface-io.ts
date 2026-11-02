import { z } from "zod";
import {
  SURFACE_CLEAR_HISTORY_VIEW,
  type SurfaceIoResult,
  type SurfaceReadResult,
  type SurfaceSendTextResult,
} from "../../../shared/cli/surface-io";
import type { TargetParams } from "../../../shared/cli/target";
import type { PtyManager } from "../../pty-manager";
import { keySequence } from "../keys";
import { CLI_ERROR_CODES } from "../protocol";
import { callRenderer, resolveSurface } from "../renderer-call";
import { CliMethodError, type CliServer } from "../server";

const PASTE_START = "\x1b[200~";
const PASTE_END = "\x1b[201~";

const SendTextSchema = z.object({
  text: z.string(),
  paste: z.boolean().optional(),
});

const SendKeySchema = z.object({
  keys: z.array(z.string()).min(1),
});

const ReadSchema = z.object({
  scrollback: z.boolean().optional(),
  lines: z.number().int().positive().optional(),
  ansi: z.boolean().optional(),
});

const TargetObjectSchema = z.object({});

function parseParams<T>(schema: z.ZodType<T>, params: unknown): T {
  const result = schema.safeParse(params ?? {});
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const path = issue?.path.join(".");
  const message = issue?.message ?? "invalid params";
  throw new CliMethodError(
    CLI_ERROR_CODES.invalidParams,
    path ? `${path}: ${message}` : message,
  );
}

function targetOf(params: unknown): TargetParams {
  const { workspaceId, paneId, surfaceId, callerSurfaceId } = (params ??
    {}) as TargetParams;
  return { workspaceId, paneId, surfaceId, callerSurfaceId };
}

export function registerSurfaceIoMethods(
  server: CliServer,
  getPtyManager: () => Promise<PtyManager>,
): void {
  const resolveTerminal = async (params: unknown) => {
    const { surfaceId, surfaceType } = await resolveSurface(targetOf(params));
    if (surfaceType !== "terminal") {
      throw new CliMethodError(
        CLI_ERROR_CODES.unsupportedSurface,
        `surface ${surfaceId} is not a terminal`,
      );
    }
    const manager = await getPtyManager();
    if (manager.findBySurfaceId(surfaceId) === undefined) {
      throw new CliMethodError(
        CLI_ERROR_CODES.notFound,
        `surface ${surfaceId} has no running terminal`,
      );
    }
    return { manager, surfaceId };
  };

  server.register(
    "surface.sendText",
    async (params): Promise<SurfaceSendTextResult> => {
      const { text, paste } = parseParams(SendTextSchema, params);
      const { manager, surfaceId } = await resolveTerminal(params);
      let data = text;
      if (paste) {
        await manager.settle(surfaceId);
        if (manager.terminalModes(surfaceId).bracketedPaste) {
          data = `${PASTE_START}${text}${PASTE_END}`;
        }
      }
      manager.writeToSurface(surfaceId, data);
      return { surfaceId, bytes: Buffer.byteLength(data) };
    },
  );

  server.register(
    "surface.sendKey",
    async (params): Promise<SurfaceIoResult> => {
      const { keys } = parseParams(SendKeySchema, params);
      const { manager, surfaceId } = await resolveTerminal(params);
      await manager.settle(surfaceId);
      const { applicationCursorKeys } = manager.terminalModes(surfaceId);
      const data = keys.map((key) => {
        const sequence = keySequence(key, applicationCursorKeys);
        if (sequence === null) {
          throw new CliMethodError(
            CLI_ERROR_CODES.invalidParams,
            `unknown key: ${key}`,
          );
        }
        return sequence;
      });
      manager.writeToSurface(surfaceId, data.join(""));
      return { surfaceId };
    },
  );

  server.register(
    "surface.read",
    async (params): Promise<SurfaceReadResult> => {
      const options = parseParams(ReadSchema, params);
      const { manager, surfaceId } = await resolveTerminal(params);
      return { surfaceId, text: await manager.readSurface(surfaceId, options) };
    },
  );

  server.register(
    "surface.clearHistory",
    async (params): Promise<SurfaceIoResult> => {
      parseParams(TargetObjectSchema, params);
      const { manager, surfaceId } = await resolveTerminal(params);
      await callRenderer(SURFACE_CLEAR_HISTORY_VIEW, { surfaceId });
      await manager.clearHeadless(surfaceId);
      return { surfaceId };
    },
  );
}
