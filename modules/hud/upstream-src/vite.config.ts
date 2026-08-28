import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  base: "./",
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    outDir: "../upstream-dist",
    emptyOutDir: true,
    rollupOptions: { input: { overlay: resolve(rootDir, "index.html") } },
  },
});
