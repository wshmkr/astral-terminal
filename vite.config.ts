import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import electron from "vite-plugin-electron";
import electronRenderer from "vite-plugin-electron-renderer";
import pkg from "./package.json";

const brandingDefines = {
  __APP_NAME__: JSON.stringify(pkg.productName),
  __APP_NAME_SHORT__: JSON.stringify(pkg.productNameShort),
  __APP_PACKAGE_NAME__: JSON.stringify(pkg.name),
  __APP_ID__: JSON.stringify(pkg.build.appId),
  __APP_VERSION__: JSON.stringify(pkg.version),
};

function htmlBranding(): Plugin {
  return {
    name: "html-branding",
    transformIndexHtml(html) {
      return html
        .replace(/%APP_NAME%/g, pkg.productName)
        .replace(/%APP_NAME_SHORT%/g, pkg.productNameShort);
    },
  };
}

export default defineConfig({
  define: brandingDefines,
  plugins: [
    htmlBranding(),
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
});
