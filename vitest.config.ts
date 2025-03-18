/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.{test,spec}.{js,jsx,ts,tsx}"],
    typecheck: {
      enabled: false,
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "examples/**",
        "tests/**",
        "**/*.d.ts",
        "tests/setup.ts",
        "vitest.config.ts",
        "scripts/**",
        "coverage/**",
        "tsup.config.ts",
        "src/generated/**",
        "src/types.ts",
        "src/cli/watch.ts",
      ],
      include: ["src/**/*.{ts,tsx}"],
      all: true,
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
