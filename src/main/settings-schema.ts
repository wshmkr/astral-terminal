import { z } from "zod";
import {
  type AppearanceSettings,
  type BrowserSettings,
  MAX_FONT_SIZE,
  MAX_UI_SCALE,
  MIN_FONT_SIZE,
  MIN_UI_SCALE,
  type NotificationSettings,
  type PersistedSettings,
  type TerminalSettings,
  type UpdateSettings,
} from "../shared/settings-types";
import type { PaneNode, Surface } from "../shared/types";

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

const SurfaceSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    name: z.string(),
    type: z.literal("terminal"),
    cwd: z.string(),
  }),
  z.object({
    id: z.string(),
    name: z.string(),
    type: z.literal("browser"),
    url: z.string(),
  }),
]) satisfies z.ZodType<Surface>;

function dropInvalid<T extends z.ZodTypeAny>(item: T) {
  return z
    .array(item.nullable().catch(null))
    .transform((arr) => arr.filter((x): x is z.infer<T> => x !== null));
}

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

const PaneNodeSchema: z.ZodType<PaneNode> = z.lazy(() =>
  z.union([LeafPaneSchema, SplitPaneSchema]),
);

const LeafPaneSchema = z
  .object({
    id: z.string(),
    kind: z.literal("leaf"),
    surfaces: dropInvalid(SurfaceSchema),
    activeSurfaceId: z.string().optional(),
  })
  .refine((o) => o.surfaces.length > 0)
  .transform((o) => {
    const firstSurface = o.surfaces[0] as Surface;
    return {
      id: o.id,
      kind: "leaf" as const,
      surfaces: o.surfaces,
      activeSurfaceId:
        o.activeSurfaceId && o.surfaces.some((s) => s.id === o.activeSurfaceId)
          ? o.activeSurfaceId
          : firstSurface.id,
    };
  });

const SplitPaneSchema = z
  .object({
    id: z.string(),
    kind: z.literal("split"),
    direction: z.enum(["horizontal", "vertical"]),
    children: dropInvalid(PaneNodeSchema),
    sizes: z.array(z.number()).optional(),
  })
  .refine((o) => o.children.length > 0)
  .transform((o) => ({
    id: o.id,
    kind: "split" as const,
    direction: o.direction,
    children: o.children,
    sizes:
      o.sizes && o.sizes.length === o.children.length ? o.sizes : undefined,
  }));

const AppearanceSchema = tolerantPartial({
  appThemeId: AppThemeIdSchema,
  terminalThemeId: TerminalThemeIdSchema,
  fontFamily: FontFamilyIdSchema,
  fontSize: z.number().min(MIN_FONT_SIZE).max(MAX_FONT_SIZE),
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
  adBlockEnabled: z.boolean(),
}) satisfies z.ZodType<Partial<BrowserSettings>>;

const WorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  layout: PaneNodeSchema,
});

export const PersistedSettingsSchema = z.object({
  workspaces: dropInvalid(WorkspaceSchema),
  activeWorkspaceId: z.string().nullable().catch(null),
  sidebarWidth: z.number().optional().catch(undefined),
  appearance: AppearanceSchema.optional().catch(undefined),
  notificationSettings: NotificationSettingsSchema.optional().catch(undefined),
  updateSettings: UpdateSettingsSchema.optional().catch(undefined),
  terminalSettings: TerminalSettingsSchema.optional().catch(undefined),
  browserSettings: BrowserSettingsSchema.optional().catch(undefined),
}) satisfies z.ZodType<PersistedSettings>;
