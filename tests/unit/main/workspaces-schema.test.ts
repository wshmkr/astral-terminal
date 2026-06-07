import { describe, expect, it } from "vitest";
import { PersistedWorkspacesSchema } from "@/main/workspaces-schema";

function leaf(id: string, surfaceIds: string[], activeSurfaceId?: string) {
  return {
    id,
    kind: "leaf",
    surfaces: surfaceIds.map((sid) => ({
      id: sid,
      name: "term",
      type: "terminal",
      cwd: "~",
    })),
    activeSurfaceId,
  };
}

function workspace(id: string, name: string, layout: unknown) {
  return { id, name, layout };
}

describe("PersistedWorkspacesSchema", () => {
  it("parses a valid single-workspace payload", () => {
    const parsed = PersistedWorkspacesSchema.parse({
      workspaces: [workspace("w1", "Workspace 1", leaf("p1", ["s1"], "s1"))],
      activeWorkspaceId: "w1",
      sidebarWidth: 240,
    });
    expect(parsed.workspaces).toHaveLength(1);
    expect(parsed.activeWorkspaceId).toBe("w1");
    expect(parsed.sidebarWidth).toBe(240);
  });

  it("drops invalid workspace entries instead of failing", () => {
    const parsed = PersistedWorkspacesSchema.parse({
      workspaces: [
        workspace("w1", "Workspace 1", leaf("p1", ["s1"], "s1")),
        { id: "w2", garbage: true },
      ],
      activeWorkspaceId: "w1",
    });
    expect(parsed.workspaces).toHaveLength(1);
    expect(parsed.workspaces[0]?.id).toBe("w1");
  });

  it("repairs a leaf's activeSurfaceId when it points at a missing surface", () => {
    const parsed = PersistedWorkspacesSchema.parse({
      workspaces: [
        workspace("w1", "Workspace 1", leaf("p1", ["s1", "s2"], "gone")),
      ],
      activeWorkspaceId: null,
    });
    const layout = parsed.workspaces[0]?.layout;
    expect(layout?.kind).toBe("leaf");
    if (layout?.kind === "leaf") {
      expect(layout.activeSurfaceId).toBe("s1");
    }
  });

  it("falls back to null for an invalid activeWorkspaceId", () => {
    const parsed = PersistedWorkspacesSchema.parse({
      workspaces: [],
      activeWorkspaceId: 123,
    });
    expect(parsed.activeWorkspaceId).toBeNull();
  });

  it("drops invalid surfaces inside a leaf", () => {
    const parsed = PersistedWorkspacesSchema.parse({
      workspaces: [
        workspace("w1", "Workspace 1", {
          id: "p1",
          kind: "leaf",
          surfaces: [
            { id: "s1", name: "term", type: "terminal", cwd: "~" },
            { id: "s2", type: "unknown-kind" },
          ],
          activeSurfaceId: "s1",
        }),
      ],
      activeWorkspaceId: "w1",
    });
    const layout = parsed.workspaces[0]?.layout;
    if (layout?.kind !== "leaf") throw new Error("expected a leaf layout");
    expect(layout.surfaces).toHaveLength(1);
    expect(layout.surfaces[0]?.id).toBe("s1");
  });
});
