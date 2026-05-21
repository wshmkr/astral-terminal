import { z } from "zod";
import type { PaneNode, PersistedWorkspaces, Surface } from "../shared/types";

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

const WorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  layout: PaneNodeSchema,
});

export const PersistedWorkspacesSchema = z.object({
  workspaces: dropInvalid(WorkspaceSchema),
  activeWorkspaceId: z.string().nullable().catch(null),
  sidebarWidth: z.number().optional().catch(undefined),
}) satisfies z.ZodType<PersistedWorkspaces>;
