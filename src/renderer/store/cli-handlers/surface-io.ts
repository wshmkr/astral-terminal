import { z } from "zod";
import {
  SURFACE_CLEAR_HISTORY_VIEW,
  type SurfaceIoResult,
} from "../../../shared/cli/surface-io";
import { getTerminalController } from "../../components/Terminal/terminal-registry";
import {
  CliHandlerError,
  parseCliParams,
  registerCliHandler,
} from "../cli-bridge";

const ClearHistoryViewSchema = z.object({ surfaceId: z.string() });

registerCliHandler(SURFACE_CLEAR_HISTORY_VIEW, (params): SurfaceIoResult => {
  const { surfaceId } = parseCliParams(ClearHistoryViewSchema, params);
  const controller = getTerminalController(surfaceId);
  if (!controller) {
    throw new CliHandlerError(
      "not_found",
      `surface ${surfaceId} has no terminal view`,
    );
  }
  controller.term.clear();
  return { surfaceId };
});
