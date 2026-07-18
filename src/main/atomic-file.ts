import { randomUUID } from "node:crypto";
import fs from "node:fs";

// Write-then-rename with a unique tmp name, so a crash mid-write can't
// truncate the target and concurrent writers can't clobber each other's tmp
// files. The tmp lives next to the target to keep the rename same-device.
// The target is realpath-resolved first: renaming over a symlink would
// replace the link itself instead of writing through it (e.g. a user's
// dotfiles-managed ~/.claude/settings.json).
export async function writeFileAtomic(
  filePath: string,
  data: string | Uint8Array,
): Promise<void> {
  const target = await fs.promises.realpath(filePath).catch(() => filePath);
  const tmpPath = `${target}.${randomUUID().slice(0, 8)}.tmp`;
  try {
    await fs.promises.writeFile(tmpPath, data);
    await fs.promises.rename(tmpPath, target);
  } catch (err) {
    await fs.promises.unlink(tmpPath).catch(() => {});
    throw err;
  }
}
