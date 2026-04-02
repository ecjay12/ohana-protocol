import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { apiDevPlugin } from "./vite-plugin-api-dev";

export default defineConfig({
  plugins: [apiDevPlugin(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@contracts": path.resolve(__dirname, "shared/HandshakeAbi.json"),
    },
  },
});
