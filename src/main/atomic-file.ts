import { randomUUID } from "node:crypto";
import fs from "node:fs";

// Resolves symlinks first so the rename writes through them, and keeps the
// target's existing permissions.
export async function writeFileAtomic(
  filePath: string,
  data: string | Uint8Array,
): Promise<void> {
  const target = await fs.promises.realpath(filePath).catch(() => filePath);
  const tmpPath = `${target}.${randomUUID().slice(0, 8)}.tmp`;
  try {
    await fs.promises.writeFile(tmpPath, data);
    const mode = await fs.promises
      .stat(target)
      .then((st) => st.mode & 0o7777)
      .catch(() => null);
    if (mode !== null) await fs.promises.chmod(tmpPath, mode);
    await fs.promises.rename(tmpPath, target);
  } catch (err) {
    await fs.promises.unlink(tmpPath).catch(() => {});
    throw err;
  }
}
