import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "scripts/import-openapi.ts"],
  format: ["esm", "cjs"],
  dts: true,
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
  inlineOnly: false,
  target: "node18",
  platform: "node",
  shims: true,
  outExtensions({ format }) {
    return {
      js: format === "cjs" ? ".cjs" : ".js",
      dts: ".d.ts",
    };
  },
});
