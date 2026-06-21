import type { CommandId } from "../../../shared/keybindings/types";
import { IPC } from "../../../shared/types";
import { getMainWindow } from "../../window";
import { CLI_ERROR_CODES } from "../protocol";
import { CliMethodError, type CliServer } from "../server";

type SplitToward = "right" | "down";

// Route through the renderer's keymap command — the same path the keybinding and split button
// use — so the CLI verb and the UI stay in lockstep
const SPLIT_COMMAND: Record<SplitToward, CommandId> = {
  right: "pane.splitRight",
  down: "pane.splitDown",
};

export function registerSurfaceSplit(server: CliServer): void {
  server.register("surface.split", (params) => {
    const direction = readDirection(params);
    const win = getMainWindow();
    if (!win) {
      throw new CliMethodError(
        CLI_ERROR_CODES.internalError,
        "no window to split",
      );
    }
    win.webContents.send(IPC.keymap.runCommand, {
      command: SPLIT_COMMAND[direction],
    });
    return { direction };
  });
}

function readDirection(params: unknown): SplitToward {
  if (params && typeof params === "object" && !Array.isArray(params)) {
    const direction = (params as Record<string, unknown>).direction;
    if (direction === "right" || direction === "down") return direction;
  }
  throw new CliMethodError(
    CLI_ERROR_CODES.invalidParams,
    'surface.split direction must be "right" or "down"',
  );
}
