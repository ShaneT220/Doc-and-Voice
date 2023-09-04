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
            "/ask": "http://localhost:5000",
            "/chat": "http://localhost:5000",
            "/processOppose": "http://localhost:5000",
            "/processSupport": "http://localhost:5000",
            "/processSummarize": "http://localhost:5000",
            "/processEverything": "http://localhost:5000"
        }
    }
});
