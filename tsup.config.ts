import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli/vite-plugin.ts"],
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ["react", "@tanstack/react-query", "axios", "zod", "vite"],
  esbuildOptions(options) {
    options.banner = {
      js: '"use client";',
    };
    return options;
  },
});
