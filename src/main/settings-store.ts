import type { PersistedSettings } from "../shared/settings-types";
import { PersistedSettingsSchema } from "./settings-schema";
import { readUserDataJson, writeUserDataJsonAtomic } from "./user-data-json";

const FILE_NAME = "settings.json";

let cache: { value: PersistedSettings | null } | null = null;

export function loadSettings(): PersistedSettings | null {
  if (cache) return cache.value;
  const value = readUserDataJson(FILE_NAME, (raw) => {
    const result = PersistedSettingsSchema.safeParse(raw);
    return result.success ? result.data : null;
  });
  cache = { value };
  return value;
}

export async function saveSettings(settings: PersistedSettings): Promise<void> {
  await writeUserDataJsonAtomic(FILE_NAME, settings);
  cache = { value: settings };
}
