import fs from "node:fs";

// Returns `undefined` on any read or parse failure; callers narrow the result.
export function readJsonFileSync(filePath: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return undefined;
  }
}
