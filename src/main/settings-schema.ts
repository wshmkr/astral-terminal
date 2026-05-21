import { z } from "zod";
import {
  type AppearanceSettings,
  type BrowserSettings,
  MAX_FONT_SIZE,
  MAX_LINE_HEIGHT,
  MAX_UI_SCALE,
  MIN_FONT_SIZE,
  MIN_LINE_HEIGHT,
  MIN_UI_SCALE,
  type NotificationSettings,
  type PersistedSettings,
  type TerminalSettings,
  type UpdateSettings,
} from "../shared/settings-types";

const AppThemeIdSchema = z.enum(["dark", "light", "black"]);
const TerminalThemeIdSchema = z.enum([
  "one-half-dark",
  "one-half-light",
  "dracula",
  "alucard",
  "github-dark",
  "github-light",
]);
const FontFamilyIdSchema = z.enum([
  "jetbrains-mono",
  "cascadia-code",
  "consolas",
  "system-monospace",
]);
const AccentColorIdSchema = z.enum([
  "blue",
  "purple",
  "pink",
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
]);

function tolerantPartial<S extends z.ZodRawShape>(shape: S) {
  type Out = { [K in keyof S]?: z.infer<S[K]> };
  const tolerantShape: Record<string, z.ZodTypeAny> = {};
  for (const [key, field] of Object.entries(shape)) {
    tolerantShape[key] = (field as z.ZodTypeAny).optional().catch(undefined);
  }
  return z.object(tolerantShape).transform((obj): Out => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) out[k] = v;
    }
    return out as Out;
  });
}

const AppearanceSchema = tolerantPartial({
  appThemeId: AppThemeIdSchema,
  terminalThemeId: TerminalThemeIdSchema,
  fontFamily: FontFamilyIdSchema,
  fontSize: z.number().min(MIN_FONT_SIZE).max(MAX_FONT_SIZE),
  terminalLineHeight: z.number().min(MIN_LINE_HEIGHT).max(MAX_LINE_HEIGHT),
  uiScale: z.number().min(MIN_UI_SCALE).max(MAX_UI_SCALE),
  accentColorId: AccentColorIdSchema,
}) satisfies z.ZodType<Partial<AppearanceSettings>>;

const NotificationSettingsSchema = tolerantPartial({
  soundEnabled: z.boolean(),
  osNotificationsEnabled: z.boolean(),
}) satisfies z.ZodType<Partial<NotificationSettings>>;

const UpdateSettingsSchema = tolerantPartial({
  autoEnabled: z.boolean(),
}) satisfies z.ZodType<Partial<UpdateSettings>>;

const TerminalSettingsSchema = tolerantPartial({
  wslDistro: z.string().nullable(),
}) satisfies z.ZodType<Partial<TerminalSettings>>;

const SearchEngineIdSchema = z.enum(["google", "bing", "duckduckgo", "custom"]);

const BrowserSettingsSchema = tolerantPartial({
  searchEngineId: SearchEngineIdSchema,
  customSearchUrl: z.string(),
  homepage: z.string(),
  adBlockEnabled: z.boolean(),
  sendGpc: z.boolean(),
}) satisfies z.ZodType<Partial<BrowserSettings>>;

export const PersistedSettingsSchema = z.object({
  appearance: AppearanceSchema.optional().catch(undefined),
  notificationSettings: NotificationSettingsSchema.optional().catch(undefined),
  updateSettings: UpdateSettingsSchema.optional().catch(undefined),
  terminalSettings: TerminalSettingsSchema.optional().catch(undefined),
  browserSettings: BrowserSettingsSchema.optional().catch(undefined),
}) satisfies z.ZodType<PersistedSettings>;
