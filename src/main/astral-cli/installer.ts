import fs from "node:fs/promises";
import path from "node:path";
import {
  compareVersions,
  parseMarkerVersion,
} from "../../shared/marker-version";
import { withKeyedLock } from "../keyed-lock";
import { resolveWslPath, runWsl } from "../wsl/home";
import { buildAstralCli, CLI_MARKER_PREFIX, CLI_VERSION } from "./build";

const CLI_RELATIVE_PATH = ".local/bin/astral";

const pathLocks = new Map<string, Promise<unknown>>();

async function installedVersion(filePath: string): Promise<string | null> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return parseMarkerVersion(content, CLI_MARKER_PREFIX);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export function ensureAstralCliInstalled(
  distro?: string | null,
): Promise<void> {
  return withKeyedLock(pathLocks, distro ?? "", async () => {
    const filePath = await resolveWslPath(CLI_RELATIVE_PATH, distro);
    const installed = await installedVersion(filePath);
    if (installed !== null) {
      const order = compareVersions(installed, CLI_VERSION);
      if (order === 0) return;
      if (order > 0) {
        console.warn(
          `[astral-cli] downgrading ~/${CLI_RELATIVE_PATH}: v${installed} → v${CLI_VERSION}`,
        );
      }
    }
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buildAstralCli(), { mode: 0o755 });
    // \\wsl$ writes don't reliably carry the exec bit; set it through the guest
    // TODO(native): on non-Windows the writeFile mode already suffices
    if (process.platform === "win32") {
      await runWsl(["sh", "-c", 'chmod 755 "$HOME/.local/bin/astral"'], distro);
    } else {
      await fs.chmod(filePath, 0o755);
    }
    console.log(
      `[astral-cli] installed ~/${CLI_RELATIVE_PATH} (v${CLI_VERSION})`,
    );
  });
}
