#!/usr/bin/env tsx
import { watch } from "chokidar";
import { resolve, dirname } from "path";
import { generateTypes } from "../../scripts/generate";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
if (process.argv[1] === resolve(__dirname, "watch.js")) {
  watchEndpoints();
}
