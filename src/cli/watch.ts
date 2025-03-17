#!/usr/bin/env tsx
import { watch } from "chokidar";
import { resolve } from "path";
import { generateTypes } from "../../scripts/generate";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);

export function watchEndpoints() {
  const endpointsDir = resolve(process.cwd(), "src/endpoints");
  console.log(`👀 Watching ${endpointsDir} for changes...`);

  watch(endpointsDir, {
    ignored: /(^|[/])\../, // ignore dotfiles
    persistent: true,
  }).on("change", (path) => {
    console.log(`File ${path} has been changed. Regenerating types...`);
    generateTypes();
  });
}

// Only run if this is the main module
if (typeof process !== "undefined" && process.argv[1] === __filename) {
  watchEndpoints();
}
