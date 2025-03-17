#!/usr/bin/env tsx
import { watch } from "chokidar";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { generateTypes } from "./generate";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function watchEndpoints() {
  const endpointsDir = resolve(process.cwd(), "src/endpoints");

  console.log("👀 Watching endpoints directory for changes...");

  watch(endpointsDir, {
    ignored: /(^|[/])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true,
  }).on("all", (event, path) => {
    console.log(`📝 Endpoint changed: ${path}`);
    generateTypes();
  });
}

// Only run if this is the main module
if (process.argv[1] === resolve(__dirname, "watch.js")) {
  watchEndpoints();
}
