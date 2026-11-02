import { z } from "zod";
import {
  SURFACE_CLEAR_HISTORY_VIEW,
  type SurfaceIoResult,
} from "../../../shared/cli/surface-io";
import { getTerminalController } from "../../components/Terminal/terminal-registry";
import { parseCliParams, registerCliHandler } from "../cli-bridge";

const ClearHistoryViewSchema = z.object({ surfaceId: z.string() });

registerCliHandler(SURFACE_CLEAR_HISTORY_VIEW, (params): SurfaceIoResult => {
  const { surfaceId } = parseCliParams(ClearHistoryViewSchema, params);
  getTerminalController(surfaceId)?.term.clear();
  return { surfaceId };
});
