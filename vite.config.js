import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: ".",
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:3000",
      "/graphql": "http://127.0.0.1:3000",
      "/events": "http://127.0.0.1:3000",
      "/health": "http://127.0.0.1:3000"
    }
  },
  build: { outDir: "dist", emptyOutDir: true }
});
