import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

function userDataPath(fileName: string): string {
  return path.join(app.getPath("userData"), fileName);
}

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
    fs.writeFileSync(userDataPath(fileName), JSON.stringify(value));
  } catch (err) {
    console.error(`${fileName}: save failed:`, err);
  }
}

export async function writeUserDataJsonAtomic(
  fileName: string,
  value: unknown,
): Promise<void> {
  const finalPath = userDataPath(fileName);
  const tmpPath = `${finalPath}.tmp`;
  await fs.promises.writeFile(tmpPath, JSON.stringify(value));
  await fs.promises.rename(tmpPath, finalPath);
}
