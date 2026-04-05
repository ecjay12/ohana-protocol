import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { apiDevPlugin } from "./vite-plugin-api-dev";
export default defineConfig({
    plugins: [apiDevPlugin(), react()],
    build: {
        chunkSizeWarningLimit: 700,
        rollupOptions: {
            output: {
                manualChunks: function (id) {
                    if (id.includes("node_modules/three"))
                        return "three";
                },
            },
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
            "@contracts": path.resolve(__dirname, "shared/HandshakeAbi.json"),
        },
    },
});
