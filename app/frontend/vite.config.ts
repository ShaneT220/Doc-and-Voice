import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        outDir: "../backend/static",
        emptyOutDir: true,
        sourcemap: true
    },
    server: {
        proxy: {
            "/ask": "http://127.0.0.1:5000",
            "/chat": "http://127.0.0.1:5000",
            "/processAudio": "http://127.0.0.1:5000"
        }
    }
});
