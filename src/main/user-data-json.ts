import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { withKeyedLock } from "./keyed-lock";

function userDataPath(fileName: string): string {
  return path.join(app.getPath("userData"), fileName);
}

const writeLocks = new Map<string, Promise<unknown>>();

export function readUserDataJson<T>(
  fileName: string,
  parse: (v: unknown) => T | null,
): T | null {
  let raw: string;
  try {
    raw = fs.readFileSync(userDataPath(fileName), "utf-8");
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.warn(`${fileName}: invalid JSON, discarding:`, err);
    return null;
  }
  const result = parse(parsed);
  if (result === null) {
    console.warn(`${fileName}: malformed shape, discarding`);
  }
  return result;
}

export function writeUserDataJsonSync(fileName: string, value: unknown): void {
  try {
    fs.writeFileSync(userDataPath(fileName), JSON.stringify(value, null, 2));
  } catch (err) {
    console.error(`${fileName}: save failed:`, err);
  }
}

// Serialized per file so overlapping saves can't interleave, and the tmp name
// is unique so a concurrent writer can't truncate a file mid-rename.
export function writeUserDataJsonAtomic(
  fileName: string,
  value: unknown,
): Promise<void> {
  return withKeyedLock(writeLocks, fileName, async () => {
    const finalPath = userDataPath(fileName);
    const tmpPath = `${finalPath}.${randomUUID().slice(0, 8)}.tmp`;
    try {
      await fs.promises.writeFile(tmpPath, JSON.stringify(value, null, 2));
      await fs.promises.rename(tmpPath, finalPath);
    } catch (err) {
      await fs.promises.unlink(tmpPath).catch(() => {});
      throw err;
    }
  });
}
