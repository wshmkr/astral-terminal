import {
  type BrowserWindow,
  clipboard,
  type HandlerDetails,
  Menu,
  shell,
  type WebContents,
} from "electron";
import { type BrowserOpenNewTabPayload, IPC } from "../shared/types";

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

export function showLinkContextMenu(
  window: BrowserWindow,
  payload: { url: string; sourceSurfaceId: string },
): void {
  const menu = Menu.buildFromTemplate([
    {
      label: "Open link in new tab",
      click: () => {
        const msg: BrowserOpenNewTabPayload = {
          sourceSurfaceId: payload.sourceSurfaceId,
          url: payload.url,
          background: false,
        };
        window.webContents.send(IPC.browser.openNewTab, msg);
      },
    },
    {
      label: "Open link in external browser",
      click: () => openInSystemBrowser(payload.url),
    },
    { type: "separator" },
    {
      label: "Copy link address",
      click: () => clipboard.writeText(payload.url),
    },
  ]);
  menu.popup({ window });
}
