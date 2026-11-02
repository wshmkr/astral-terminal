import { z } from "zod";
import {
  SURFACE_CLEAR_HISTORY_VIEW,
  type SurfaceIoResult,
} from "../../../shared/cli/surface-io";
import { getTerminalController } from "../../components/Terminal/terminal-registry";
import { parseCliParams, registerCliHandler } from "../cli-bridge";

const ClearHistoryViewSchema = z.object({ surfaceId: z.string() });

registerCliHandler(
  SURFACE_CLEAR_HISTORY_VIEW,
  async (params): Promise<SurfaceIoResult> => {
    const { surfaceId } = parseCliParams(ClearHistoryViewSchema, params);
    const term = getTerminalController(surfaceId)?.term;
    if (term) {
      await new Promise<void>((resolve) => {
        term.write("", () => {
          term.clear();
          resolve();
        });
      });
    }
    return { surfaceId };
  },
);
