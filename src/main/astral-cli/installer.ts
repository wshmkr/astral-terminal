import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { app } from "electron";
import {
  compareVersions,
  parseMarkerVersion,
} from "../../shared/marker-version";
import { APP_PACKAGE_NAME, ASTRAL_CLI_VERSION } from "../../shared/meta";
import { IS_DEV } from "../env";
import { withKeyedLock } from "../keyed-lock";
import { resolveWslPath, runWsl } from "../wsl/home";

// Bump astralCliVersion in package.json on any cli/ change so stale installs are replaced
const CLI_MARKER_PREFIX = `${APP_PACKAGE_NAME}:cli`;
const CLI_RELATIVE_PATH = ".local/bin/astral";

const pathLocks = new Map<string, Promise<unknown>>();

// Overwriting an astral we didn't create would clobber the user's own file
export class ForeignCliError extends Error {
  constructor(relativePath: string) {
    super(
      `~/${relativePath} already exists and was not created by Astral Terminal. Rename or remove it to let Astral install its CLI.`,
    );
    this.name = "ForeignCliError";
  }
}

type InstalledCli =
  | { kind: "absent" }
  | { kind: "unmarked" }
  | { kind: "marked"; version: string };

async function readInstalledCli(filePath: string): Promise<InstalledCli> {
  let content: string;
  try {
    content = (await fs.readFile(filePath)).toString("latin1");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT")
      return { kind: "absent" };
    throw err;
  }
  const version = parseMarkerVersion(content, CLI_MARKER_PREFIX);
  return version === null ? { kind: "unmarked" } : { kind: "marked", version };
}

type CliArch = "amd64" | "arm64";

async function detectCliArch(distro?: string | null): Promise<CliArch | null> {
  // TODO(native): on non-Windows the guest is the host
  const machine =
    process.platform === "win32"
      ? (await runWsl(["uname", "-m"], distro)).stdout.trim()
      : os.machine();
  switch (machine) {
    case "x86_64":
      return "amd64";
    case "aarch64":
    case "arm64":
      return "arm64";
    default:
      console.warn(
        `[astral-cli] skipping install: unsupported architecture ${machine}`,
      );
      return null;
  }
}

async function readBundledCli(arch: CliArch): Promise<Buffer | null> {
  const dir = IS_DEV
    ? path.join(app.getAppPath(), "dist-cli")
    : path.join(process.resourcesPath, "cli");
  const binaryPath = path.join(dir, `astral-linux-${arch}`);
  try {
    return await fs.readFile(binaryPath);
  } catch (err) {
    if (IS_DEV && (err as NodeJS.ErrnoException).code === "ENOENT") {
      console.warn(
        `[astral-cli] skipping install: ${binaryPath} not found. Run \`npm run build:cli\` to test the CLI in dev.`,
      );
      return null;
    }
    throw err;
  }
}

// Resolves false when the install was skipped because no bundled binary applies
export function ensureAstralCliInstalled(
  distro?: string | null,
): Promise<boolean> {
  return withKeyedLock(pathLocks, distro ?? "", async () => {
    const filePath = await resolveWslPath(CLI_RELATIVE_PATH, distro);
    const installed = await readInstalledCli(filePath);
    if (installed.kind === "unmarked") {
      throw new ForeignCliError(CLI_RELATIVE_PATH);
    }
    if (installed.kind === "marked") {
      const order = compareVersions(installed.version, ASTRAL_CLI_VERSION);
      // Dev reinstalls so a rebuilt dist-cli replaces an install of the same version
      if (order === 0 && !IS_DEV) return true;
      if (order > 0) {
        console.warn(
          `[astral-cli] downgrading ~/${CLI_RELATIVE_PATH}: v${installed.version} → v${ASTRAL_CLI_VERSION}`,
        );
      }
    }
    const arch = await detectCliArch(distro);
    if (arch === null) return false;
    const binary = await readBundledCli(arch);
    if (binary === null) return false;
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Stage then rename so the marker only lands on a complete, executable file
    const tmpRelativePath = `${path.posix.dirname(CLI_RELATIVE_PATH)}/.astral.${process.pid}.tmp`;
    const tmpPath = await resolveWslPath(tmpRelativePath, distro);
    try {
      await fs.writeFile(tmpPath, binary, { mode: 0o755 });
      if (process.platform === "win32") {
        // \\wsl$ writes don't reliably carry the exec bit; chmod and rename inside the guest
        // TODO(native): on non-Windows the writeFile mode already suffices
        await runWsl(
          [
            "sh",
            "-c",
            `chmod 755 "$HOME/${tmpRelativePath}" && mv -f "$HOME/${tmpRelativePath}" "$HOME/${CLI_RELATIVE_PATH}"`,
          ],
          distro,
        );
      } else {
        await fs.chmod(tmpPath, 0o755);
        await fs.rename(tmpPath, filePath);
      }
    } catch (err) {
      await fs.rm(tmpPath, { force: true }).catch(() => {});
      throw err;
    }
    console.log(
      `[astral-cli] installed ~/${CLI_RELATIVE_PATH} (v${ASTRAL_CLI_VERSION})`,
    );
    return true;
  });
}
