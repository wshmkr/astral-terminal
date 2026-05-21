import type { PersistedSettings } from "../shared/settings-types";
import { PersistedSettingsSchema } from "./settings-schema";
import { readUserDataJson, writeUserDataJsonAtomic } from "./user-data-json";

const FILE_NAME = "settings.json";

let loaded = false;
let cached: Readonly<PersistedSettings> | null = null;

export function loadSettings(): Readonly<PersistedSettings> | null {
  if (loaded) return cached;
  cached = readUserDataJson(FILE_NAME, (raw) => {
    const result = PersistedSettingsSchema.safeParse(raw);
    return result.success ? result.data : null;
  });
  loaded = true;
  return cached;
}

export async function saveSettings(settings: PersistedSettings): Promise<void> {
  await writeUserDataJsonAtomic(FILE_NAME, settings);
  cached = settings;
  loaded = true;
}
