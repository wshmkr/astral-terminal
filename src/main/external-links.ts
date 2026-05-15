import { type HandlerDetails, shell, type WebContents } from "electron";

function parseHttpUrl(url: string): URL | null {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u : null;
  } catch {
    return null;
  }
}

export function attachExternalLinkHandler(
  webContents: WebContents,
  onPopup: (url: string, disposition: HandlerDetails["disposition"]) => void,
): void {
  webContents.setWindowOpenHandler(({ url, disposition }) => {
    if (parseHttpUrl(url)) onPopup(url, disposition);
    return { action: "deny" };
  });
}

export function openInSystemBrowser(url: string): void {
  if (parseHttpUrl(url)) shell.openExternal(url);
}
