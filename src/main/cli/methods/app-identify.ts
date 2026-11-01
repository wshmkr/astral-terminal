import { app } from "electron";
import { z } from "zod";
import type { ActiveRef } from "../../../shared/types";
import { getActiveRef } from "../active-ref";
import { CLI_ERROR_CODES } from "../protocol";
import { resolveSurface } from "../renderer-call";
import { CliMethodError, type CliServer } from "../server";

const ParamsSchema = z
  .object({ callerSurfaceId: z.string().optional() })
  .nullish();

async function resolveCaller(
  callerSurfaceId: string | undefined,
): Promise<ActiveRef | null> {
  if (callerSurfaceId === undefined) return null;
  try {
    const { workspaceId, paneId, surfaceId } = await resolveSurface({
      surfaceId: callerSurfaceId,
    });
    return { workspaceId, paneId, surfaceId };
  } catch {
    return null;
  }
}

export function registerAppIdentify(server: CliServer): void {
  server.register("app.identify", async (params) => {
    const parsed = ParamsSchema.safeParse(params);
    if (!parsed.success) {
      throw new CliMethodError(
        CLI_ERROR_CODES.invalidParams,
        "app.identify takes only an optional callerSurfaceId",
      );
    }
    return {
      pid: process.pid,
      name: app.getName(),
      version: app.getVersion(),
      platform: process.platform,
      socketPath: server.getSocketPath(),
      active: getActiveRef(),
      caller: await resolveCaller(parsed.data?.callerSurfaceId),
    };
  });
}
