import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import electron from "vite-plugin-electron";
import electronRenderer from "vite-plugin-electron-renderer";
import pkg from "./package.json";

function htmlBranding(appName: string, appNameShort: string): Plugin {
  return {
    name: "html-branding",
    transformIndexHtml(html) {
      return html
        .replace(/%APP_NAME%/g, appName)
        .replace(/%APP_NAME_SHORT%/g, appNameShort);
    },
  };
}

export default defineConfig(({ command }) => {
  const suffix = command === "serve" ? " (dev)" : "";
  const appName = `${pkg.productName}${suffix}`;
  const appNameShort = `${pkg.productNameShort}${suffix}`;
  const brandingDefines = {
    __APP_NAME__: JSON.stringify(appName),
    __APP_NAME_SHORT__: JSON.stringify(appNameShort),
    __APP_PACKAGE_NAME__: JSON.stringify(pkg.name),
  };

  return {
    define: brandingDefines,
    plugins: [
      htmlBranding(appName, appNameShort),
      react(),
      electron([
        {
          entry: "src/main/index.ts",
          vite: {
            define: brandingDefines,
            build: {
              outDir: "dist/main",
              rollupOptions: {
                external: [
                  "electron",
                  "electron-squirrel-startup",
                  "node-pty",
                  "@xterm/headless",
                  "@xterm/addon-serialize",
                ],
              },
            },
          },
        },
        {
          entry: "src/main/preload.ts",
          onstart(args) {
            args.reload();
          },
          vite: {
            define: brandingDefines,
            build: {
              outDir: "dist/preload",
              rollupOptions: {
                external: ["electron"],
              },
            },
          },
        },
      ]),
      electronRenderer(),
    ],
  };
});
