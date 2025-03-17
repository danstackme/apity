import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { apityPlugin } from "@danstackme/apity/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apityPlugin()],
});
