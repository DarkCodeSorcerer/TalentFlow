import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // Build configuration for production
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "terser",
  },
  // Preview configuration
  preview: {
    port: 4173,
  },
});


