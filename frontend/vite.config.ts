import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Relative base + hash routing: the build runs from any static host or sub-path.
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { port: 3000, host: "0.0.0.0" },
});
