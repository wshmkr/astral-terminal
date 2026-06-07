import {
  type BrowserWindow,
  type ContextMenuParams,
  clipboard,
  type HandlerDetails,
  Menu,
  type MenuItemConstructorOptions,
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

interface BrowserContextMenuCtx {
  webContents: WebContents;
  surface?: { id: string };
}

function buildLinkItems(
  window: BrowserWindow,
  url: string,
  surface: { id: string } | undefined,
): MenuItemConstructorOptions[] {
  const items: MenuItemConstructorOptions[] = [];
  if (surface) {
    const sourceSurfaceId = surface.id;
    items.push({
      label: "Open link in new tab",
      click: () => {
        const msg: BrowserOpenNewTabPayload = {
          sourceSurfaceId,
          url,
          background: false,
        };
        window.webContents.send(IPC.browser.openNewTab, msg);
      },
    });
  }
  items.push(
    {
      label: "Open link in external browser",
      click: () => openInSystemBrowser(url),
    },
    {
      label: "Copy link address",
      click: () => clipboard.writeText(url),
    },
  );
  return items;
}

function buildEditableItems(
  webContents: WebContents,
  params: ContextMenuParams,
): MenuItemConstructorOptions[] {
  const { editFlags, selectionText } = params;
  const hasSelection = selectionText.length > 0;
  return [
    {
      label: "Cut",
      enabled: editFlags.canCut && hasSelection,
      click: () => webContents.cut(),
    },
    {
      label: "Copy",
      enabled: editFlags.canCopy && hasSelection,
      click: () => webContents.copy(),
    },
    {
      label: "Paste",
      enabled: editFlags.canPaste,
      click: () => webContents.paste(),
    },
    {
      label: "Select all",
      enabled: editFlags.canSelectAll,
      click: () => webContents.selectAll(),
    },
  ];
}

function buildImageItems(
  webContents: WebContents,
  params: ContextMenuParams,
): MenuItemConstructorOptions[] {
  return [
    {
      label: "Copy image",
      click: () => webContents.copyImageAt(params.x, params.y),
    },
    {
      label: "Copy image address",
      click: () => clipboard.writeText(params.srcURL),
    },
    {
      label: "Save image as…",
      click: () => webContents.downloadURL(params.srcURL),
    },
  ];
}

export function showBrowserContextMenu(
  window: BrowserWindow,
  params: ContextMenuParams,
  ctx: BrowserContextMenuCtx,
): void {
  const groups: MenuItemConstructorOptions[][] = [];

  if (params.isEditable) {
    groups.push(buildEditableItems(ctx.webContents, params));
  } else if (params.selectionText.length > 0) {
    groups.push([
      {
        label: "Copy",
        click: () => clipboard.writeText(params.selectionText),
      },
    ]);
  }

  if (params.linkURL) {
    groups.push(buildLinkItems(window, params.linkURL, ctx.surface));
  }

  if (params.mediaType === "image" && params.srcURL) {
    groups.push(buildImageItems(ctx.webContents, params));
  }

  if (groups.length === 0) return;

  const template: MenuItemConstructorOptions[] = [];
  for (const group of groups) {
    if (template.length > 0) template.push({ type: "separator" });
    template.push(...group);
  }

  Menu.buildFromTemplate(template).popup({ window });
}

export function showLinkContextMenu(
  window: BrowserWindow,
  payload: { url: string; sourceSurfaceId: string },
): void {
  const template = buildLinkItems(window, payload.url, {
    id: payload.sourceSurfaceId,
  });
  Menu.buildFromTemplate(template).popup({ window });
}
