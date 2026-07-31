import { describe, expect, it } from "vitest";
import {
  createBrowserSurface,
  createDefaultWorkspace,
  createLeafPane,
  createTerminalSurface,
  generateId,
  nextWorkspaceName,
} from "@/renderer/store/factories";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("generateId", () => {
  it("produces unique uuids", () => {
    const a = generateId();
    const b = generateId();
    expect(a).toMatch(UUID_RE);
    expect(a).not.toBe(b);
  });
});

describe("createTerminalSurface", () => {
  it("defaults the cwd to ~", () => {
    expect(createTerminalSurface()).toMatchObject({
      type: "terminal",
      name: "~",
      cwd: "~",
    });
  });

  it("uses the given cwd", () => {
    expect(createTerminalSurface("/home/user")).toMatchObject({
      cwd: "/home/user",
    });
  });

  it("falls back to ~ for an empty cwd", () => {
    expect(createTerminalSurface("")).toMatchObject({ cwd: "~" });
  });
});

describe("createBrowserSurface", () => {
  it("defaults to about:blank", () => {
    expect(createBrowserSurface()).toMatchObject({
      type: "browser",
      name: "New Tab",
      url: "about:blank",
    });
  });

  it("uses the given url", () => {
    expect(createBrowserSurface("https://example.com")).toMatchObject({
      url: "https://example.com",
    });
  });
});

describe("createLeafPane", () => {
  it("wraps a single terminal surface and focuses it", () => {
    const pane = createLeafPane();
    expect(pane.kind).toBe("leaf");
    expect(pane.surfaces).toHaveLength(1);
    expect(pane.activeSurfaceId).toBe(pane.surfaces[0]?.id);
  });
});

describe("nextWorkspaceName", () => {
  it("starts at Workspace 1 when none exist", () => {
    expect(nextWorkspaceName([])).toBe("Workspace 1");
  });

  it("picks the first unused number", () => {
    const existing = [
      createDefaultWorkspace("Workspace 1"),
      createDefaultWorkspace("Workspace 2"),
    ];
    expect(nextWorkspaceName(existing)).toBe("Workspace 3");
  });

  it("fills a gap left by a missing number", () => {
    expect(nextWorkspaceName([createDefaultWorkspace("Workspace 2")])).toBe(
      "Workspace 1",
    );
  });

  it("ignores names that do not match the pattern", () => {
    expect(nextWorkspaceName([createDefaultWorkspace("Scratch")])).toBe(
      "Workspace 1",
    );
  });
});
