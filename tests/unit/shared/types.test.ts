import { describe, expect, it } from "vitest";
import {
  type BrowserSurface,
  decodeAppModeArg,
  defaultBrowserState,
  encodeAppModeArg,
  isBrowserCommand,
  isBrowserSurface,
  isTerminalSurface,
  surfaceSidebarLabel,
  type TerminalSurface,
} from "@/shared/types";

const terminal: TerminalSurface = {
  id: "t1",
  name: "bash",
  type: "terminal",
  cwd: "~",
};

const browser: BrowserSurface = {
  id: "b1",
  name: "Example",
  type: "browser",
  url: "https://example.com",
};

describe("surface type guards", () => {
  it("isTerminalSurface narrows terminal surfaces only", () => {
    expect(isTerminalSurface(terminal)).toBe(true);
    expect(isTerminalSurface(browser)).toBe(false);
  });

  it("isBrowserSurface narrows browser surfaces only", () => {
    expect(isBrowserSurface(browser)).toBe(true);
    expect(isBrowserSurface(terminal)).toBe(false);
  });
});

describe("isBrowserCommand", () => {
  it("accepts known browser commands", () => {
    expect(isBrowserCommand("goBack")).toBe(true);
    expect(isBrowserCommand("reload")).toBe(true);
    expect(isBrowserCommand("focus")).toBe(true);
  });

  it("rejects unknown strings and non-strings", () => {
    expect(isBrowserCommand("teleport")).toBe(false);
    expect(isBrowserCommand(123)).toBe(false);
    expect(isBrowserCommand(null)).toBe(false);
  });
});

describe("app mode argument encoding", () => {
  it("round-trips through encode and decode", () => {
    expect(decodeAppModeArg([encodeAppModeArg("dev")])).toBe("dev");
    expect(decodeAppModeArg([encodeAppModeArg("packaged")])).toBe("packaged");
  });

  it("defaults to packaged when the flag is absent", () => {
    expect(decodeAppModeArg([])).toBe("packaged");
    expect(decodeAppModeArg(["--other"])).toBe("packaged");
  });

  it("treats any non-dev value as packaged", () => {
    expect(decodeAppModeArg(["--astral-mode=garbage"])).toBe("packaged");
  });
});

describe("surfaceSidebarLabel", () => {
  it("strips a user@host: prefix from terminal labels", () => {
    expect(
      surfaceSidebarLabel({ ...terminal, name: "user@host: ~/project" }),
    ).toBe("~/project");
  });

  it("leaves a plain terminal name unchanged", () => {
    expect(surfaceSidebarLabel(terminal)).toBe("bash");
  });

  it("prefixes browser labels rather than stripping them", () => {
    const label = surfaceSidebarLabel(browser);
    expect(label).not.toBe(browser.name);
    expect(label.endsWith(" Example")).toBe(true);
  });
});

describe("defaultBrowserState", () => {
  it("builds an idle browser state for the given url", () => {
    expect(defaultBrowserState("https://example.com")).toEqual({
      url: "https://example.com",
      title: "",
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      favicon: null,
    });
  });
});
