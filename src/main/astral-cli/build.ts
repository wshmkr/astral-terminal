import { APP_PACKAGE_NAME } from "../../shared/meta";
import astralScript from "./astral.sh?raw";

// Bump on any astral.sh change so stale installs are replaced
export const CLI_VERSION = "0.3";

export const CLI_MARKER_PREFIX = `${APP_PACKAGE_NAME}:cli`;
export const CLI_MARKER = `${CLI_MARKER_PREFIX}:v${CLI_VERSION}`;

export function buildAstralCli(): string {
  return astralScript
    .replaceAll("__ASTRAL_CLI_MARKER__", CLI_MARKER)
    .replaceAll("__ASTRAL_CLI_VERSION__", CLI_VERSION);
}
