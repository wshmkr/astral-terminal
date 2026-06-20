import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

const PASTE_DIR = path.join(os.tmpdir(), "astral-terminal");

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
  const ext = EXT_BY_MIME[mime] ?? "png";
  const hash = createHash("sha256").update(bytes).digest("hex");
  const filePath = path.join(PASTE_DIR, `image-${hash}.${ext}`);
  if (await pathExists(filePath)) return filePath;
  await writeFileAtomic(filePath, Buffer.from(bytes));
  return filePath;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeFileAtomic(filePath: string, data: Buffer): Promise<void> {
  const tmpPath = path.join(PASTE_DIR, `.tmp-${randomUUID()}`);
  try {
    await fs.writeFile(tmpPath, data);
    await fs.rename(tmpPath, filePath);
  } catch (err) {
    await fs.rm(tmpPath, { force: true });
    throw err;
  }
}
