import { shell, type WebContents } from "electron";

function openExternalIfHttp(url: string): void {
  try {
    const u = new URL(url);
    if (u.protocol === "http:" || u.protocol === "https:") {
      shell.openExternal(url);
    }
  } catch {}
}

export function attachExternalLinkHandler(webContents: WebContents): void {
  webContents.setWindowOpenHandler(({ url }) => {
    openExternalIfHttp(url);
    return { action: "deny" };
  });
}
