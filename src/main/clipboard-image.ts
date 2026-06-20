import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

const PASTE_DIR = path.join(os.tmpdir(), "astral-terminal");
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/bmp": "bmp",
  "image/svg+xml": "svg",
};

export async function saveClipboardImage(
  bytes: Uint8Array,
  mime: string,
): Promise<string> {
  await fs.mkdir(PASTE_DIR, { recursive: true });
  void pruneStalePasteFiles();
  const ext = EXT_BY_MIME[mime] ?? "png";
  const filePath = path.join(PASTE_DIR, `image-${Date.now()}.${ext}`);
  await fs.writeFile(filePath, Buffer.from(bytes));
  return filePath;
}

async function pruneStalePasteFiles(): Promise<void> {
  try {
    const cutoff = Date.now() - MAX_AGE_MS;
    const names = await fs.readdir(PASTE_DIR);
    await Promise.all(
      names.map(async (name) => {
        const filePath = path.join(PASTE_DIR, name);
        try {
          const stat = await fs.stat(filePath);
          if (stat.mtimeMs < cutoff) await fs.unlink(filePath);
        } catch {
          // File vanished or is inaccessible; nothing to prune.
        }
      }),
    );
  } catch {
    // Directory missing or unreadable; pruning is best-effort.
  }
}
