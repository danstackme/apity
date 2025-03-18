import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    "react",
    "@tanstack/react-query",
    "axios",
    "zod",
    "vite",
    "@babel/parser",
    "@babel/traverse",
    "@babel/types",
  ],
  esbuildOptions(options) {
    options.banner = {
      js: '"use client";',
    };
    return options;
  },
});
