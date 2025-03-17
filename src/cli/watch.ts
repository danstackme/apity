#!/usr/bin/env tsx
import { watch } from "chokidar";
import { resolve } from "path";
import { generateTypes } from "../../scripts/generate";

export function watchEndpoints() {
  const endpointsDir = resolve(process.cwd(), "src/endpoints");
  console.log(`👀 Watching ${endpointsDir} for changes...`);

  watch(endpointsDir, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
  }).on("change", (path) => {
    console.log(`File ${path} has been changed. Regenerating types...`);
    generateTypes();
  });
}

if (require.main === module) {
  watchEndpoints();
}
