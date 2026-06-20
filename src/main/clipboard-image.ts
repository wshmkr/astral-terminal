import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

const PASTE_DIR = path.join(os.tmpdir(), "astral-terminal");
const MAX_IMAGE_BYTES = 64 * 1024 * 1024;

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
  if (bytes.byteLength === 0) {
    throw new Error("saveClipboardImage: empty image payload");
  }
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("saveClipboardImage: image payload exceeds size limit");
  }
  await fs.mkdir(PASTE_DIR, { recursive: true });
  const ext = sniffExtension(bytes) ?? EXT_BY_MIME[mime] ?? "png";
  const hash = createHash("sha256").update(bytes).digest("hex");
  const filePath = path.join(PASTE_DIR, `image-${hash}.${ext}`);
  if (await pathExists(filePath)) return filePath;
  await writeFileAtomic(filePath, Buffer.from(bytes));
  return filePath;
}

export async function clearPasteImages(): Promise<void> {
  await fs.rm(PASTE_DIR, { recursive: true, force: true });
}

function sniffExtension(bytes: Uint8Array): string | undefined {
  const startsWith = (...sig: number[]) =>
    sig.every((byte, i) => bytes[i] === byte);
  if (startsWith(0x89, 0x50, 0x4e, 0x47)) return "png";
  if (startsWith(0xff, 0xd8, 0xff)) return "jpg";
  if (startsWith(0x47, 0x49, 0x46, 0x38)) return "gif";
  if (startsWith(0x42, 0x4d)) return "bmp";
  if (
    startsWith(0x52, 0x49, 0x46, 0x46) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  return undefined;
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
    try {
      await fs.rm(tmpPath, { force: true });
    } catch (cleanupErr) {
      console.warn("Failed to remove temp clipboard image:", cleanupErr);
    }
    throw err;
  }
}
