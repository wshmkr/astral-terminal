import { describe, expect, it } from "vitest";
import { windowsPtyOptions } from "@/shared/pty-options";
import type { AppConfig } from "@/shared/types";

function config(platform: AppConfig["platform"]): AppConfig {
  return { platform };
}

describe("windowsPtyOptions", () => {
  it("returns undefined when not on Windows", () => {
    expect(windowsPtyOptions(config({ isWindows: false }))).toBeUndefined();
  });

  it("selects the conpty backend with the Windows build number", () => {
    expect(
      windowsPtyOptions(config({ isWindows: true, windowsBuild: 22631 })),
    ).toEqual({ backend: "conpty", buildNumber: 22631 });
  });

  it("omits the build number when it is unknown", () => {
    expect(windowsPtyOptions(config({ isWindows: true }))).toEqual({
      backend: "conpty",
      buildNumber: undefined,
    });
  });
});
