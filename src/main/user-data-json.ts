import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

function userDataPath(fileName: string): string {
  return path.join(app.getPath("userData"), fileName);
}

export function readUserDataJson<T>(
  fileName: string,
  validate: (v: unknown) => v is T,
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
  if (!validate(parsed)) {
    console.warn(`${fileName}: malformed shape, discarding`);
    return null;
  }
  return parsed;
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
  try {
    await fs.promises.writeFile(tmpPath, JSON.stringify(value));
    await fs.promises.rename(tmpPath, finalPath);
  } catch (err) {
    console.error(`${fileName}: save failed:`, err);
  }
}
