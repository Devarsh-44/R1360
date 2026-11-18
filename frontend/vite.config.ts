import react from "@vitejs/plugin-react";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

// The launch films in public/media are for the website only; keep ~8 MB of video out of the app.
const dropMedia = (): Plugin => ({
  name: "ri360-drop-media",
  apply: "build",
  closeBundle() {
    rmSync(resolve(__dirname, "dist/media"), { recursive: true, force: true });
  },
});

// Relative base + hash routing: the build runs from any static host, sub-path, or inside the app.
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [react(), ...(mode === "mobile" ? [dropMedia()] : [])],
  server: { port: 3000, host: "0.0.0.0" },
}));
