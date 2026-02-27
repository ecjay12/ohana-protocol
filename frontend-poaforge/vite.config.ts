import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@contracts-poaforge": path.resolve(__dirname, "../artifacts/contracts/core/POAPForge.sol/POAPForge.json"),
      "@contracts-poap-nft": path.resolve(__dirname, "../artifacts/contracts/core/POAPEventNFT.sol/POAPEventNFT.json"),
    },
  },
  define: {
    global: "globalThis",
  },
});
