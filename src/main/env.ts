import { app } from "electron";
import type { AppMode } from "../shared/types";

export const IS_DEV = !app.isPackaged;
export const APP_MODE: AppMode = IS_DEV ? "dev" : "packaged";
