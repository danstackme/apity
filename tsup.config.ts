import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "scripts/import-openapi.ts"],
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
  noExternal: ["yaml"],
  target: "node18",
  platform: "node",
  shims: true,
});
