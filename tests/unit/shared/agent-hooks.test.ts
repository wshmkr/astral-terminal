import { describe, expect, it } from "vitest";
import { findAgentProvider, isAgentHookInstalled } from "@/shared/agent-hooks";

describe("isAgentHookInstalled", () => {
  it("treats installed and stale as installed", () => {
    expect(isAgentHookInstalled("installed")).toBe(true);
    expect(isAgentHookInstalled("stale")).toBe(true);
  });

  it("treats missing and undefined as not installed", () => {
    expect(isAgentHookInstalled("missing")).toBe(false);
    expect(isAgentHookInstalled(undefined)).toBe(false);
  });
});

describe("findAgentProvider", () => {
  it("finds the Claude provider by name", () => {
    const provider = findAgentProvider("Claude");
    expect(provider?.name).toBe("Claude");
    expect(provider?.settingsPath).toBe(".claude/settings.json");
  });

  it("builds a resume command from a session id", () => {
    const provider = findAgentProvider("Claude");
    expect(provider?.resumeCommand("abc-123")).toBe("claude --resume abc-123");
  });

  it("returns undefined for an unknown provider", () => {
    expect(findAgentProvider("Cursor")).toBeUndefined();
  });
});
