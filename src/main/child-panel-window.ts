import path from "node:path";
import { BrowserWindow } from "electron";
import { encodeAppModeArg } from "../shared/types";
import { APP_MODE, IS_DEV } from "./env";

const DEV_URL = IS_DEV ? process.env.VITE_DEV_SERVER_URL : undefined;

interface ChildPanelOptions {
  parent: BrowserWindow;
  hash: string;
  width: number;
  height: number;
}

export function createChildPanelWindow({
  parent,
  hash,
  width,
  height,
}: ChildPanelOptions): BrowserWindow {
  const win = new BrowserWindow({
    width,
    height,
    show: false,
    frame: false,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    parent,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      additionalArguments: [encodeAppModeArg(APP_MODE)],
    },
  });

  if (DEV_URL) {
    win.loadURL(`${DEV_URL}#${hash}`);
  } else {
    win.loadFile(path.join(__dirname, "../index.html"), { hash });
  }

  win.webContents.on("page-title-updated", (event) => {
    event.preventDefault();
  });

  return win;
}
