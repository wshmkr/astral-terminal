import { app } from "electron";
import { getActiveRef } from "../active-ref";
import { CLI_ERROR_CODES } from "../protocol";
import { CliMethodError, type CliServer } from "../server";

export function registerAppIdentify(server: CliServer): void {
  server.register("app.identify", (params) => {
    if (params !== undefined) {
      throw new CliMethodError(
        CLI_ERROR_CODES.invalidParams,
        "app.identify takes no params",
      );
    }
    return {
      pid: process.pid,
      name: app.getName(),
      version: app.getVersion(),
      platform: process.platform,
      socketPath: server.getSocketPath(),
      active: getActiveRef(),
    };
  });
}
