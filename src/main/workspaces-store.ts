import type { PersistedWorkspaces } from "../shared/types";
import { readUserDataJson, writeUserDataJsonAtomic } from "./user-data-json";
import { PersistedWorkspacesSchema } from "./workspaces-schema";

const FILE_NAME = "workspaces.json";

// TODO: remove the legacy settings.json fallback after the next release ships —
// by then all installs will have written workspaces.json at least once.
const LEGACY_FILE_NAME = "settings.json";

function parse(raw: unknown): PersistedWorkspaces | null {
  const result = PersistedWorkspacesSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function loadWorkspaces(): PersistedWorkspaces | null {
  const parsed = readUserDataJson(FILE_NAME, parse);
  if (parsed) return parsed;
  const legacy = readUserDataJson(LEGACY_FILE_NAME, parse);
  if (legacy && legacy.workspaces.length > 0) return legacy;
  return null;
}

export function saveWorkspaces(value: PersistedWorkspaces): Promise<void> {
  return writeUserDataJsonAtomic(FILE_NAME, value);
}
