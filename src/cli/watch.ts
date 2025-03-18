#!/usr/bin/env tsx
import { watch } from "chokidar";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { generateTypes } from "../../scripts/generate";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function watchEndpoints() {
  const endpointsDir = resolve(process.cwd(), "src/endpoints");
  console.log(`👀 Watching ${endpointsDir} for changes...`);

  watch(endpointsDir, {
    ignored: /(^|[/])\../, // ignore dotfiles
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
  }).on("change", () => {
    console.log(`Api endpoints have been changed. Regenerating types...`);
    generateTypes().catch((error) => {
      console.error(`[apity] Error generating types:`, error);
    });
  });
}

// Only run if this is the main module
if (process.argv[1] === resolve(__dirname, "watch.js")) {
  watchEndpoints();
}
