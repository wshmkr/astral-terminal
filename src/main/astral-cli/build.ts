import { APP_PACKAGE_NAME } from "../../shared/meta";
import astralScript from "./astral.sh?raw";

// Bump after any change to astral.sh so installed copies are detected as stale and replaced
export const CLI_VERSION = "1";

export const CLI_MARKER_PREFIX = `${APP_PACKAGE_NAME}:cli`;
export const CLI_MARKER = `${CLI_MARKER_PREFIX}:v${CLI_VERSION}`;

export function buildAstralCli(): string {
  return astralScript
    .replace("__ASTRAL_CLI_MARKER__", CLI_MARKER)
    .replace("__ASTRAL_CLI_VERSION__", CLI_VERSION);
}
