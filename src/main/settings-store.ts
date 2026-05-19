import {
  type PersistedSettings,
  PersistedSettingsSchema,
} from "../shared/settings-schema";
import { readUserDataJson, writeUserDataJsonAtomic } from "./user-data-json";

const FILE_NAME = "settings.json";

export function loadSettings(): PersistedSettings | null {
  return readUserDataJson(FILE_NAME, (raw) => {
    const result = PersistedSettingsSchema.safeParse(raw);
    return result.success ? result.data : null;
  });
}

export function saveSettings(settings: PersistedSettings): Promise<void> {
  return writeUserDataJsonAtomic(FILE_NAME, settings);
}
