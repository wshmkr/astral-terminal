import { app, Menu, type MenuItemConstructorOptions } from "electron";

// The default Electron menu registers accelerators (reload, devtools, zoom,
// close) that would shadow our keymap — most damagingly Ctrl/Cmd+R reloading
// the whole shell. We install a deliberately sparse menu so those keys reach
// the renderer / browser keymap instead.
export function installAppMenu(): void {
  const isMac = process.platform === "darwin";
  const template: MenuItemConstructorOptions[] = [];

  if (isMac) {
    // macOS keeps a menu bar regardless; appMenu (Quit/Hide) and editMenu
    // (clipboard roles, needed for Cmd+C/V in inputs) are the minimum. The
    // View/Window menus are omitted so Cmd+R/W/T and F12 stay free.
    template.push({ role: "appMenu" }, { role: "editMenu" });
  }

  if (!app.isPackaged) {
    template.push({ label: "Develop", submenu: [{ role: "toggleDevTools" }] });
  }

  if (template.length === 0) {
    Menu.setApplicationMenu(null);
    return;
  }
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
