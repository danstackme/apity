#!/usr/bin/env tsx
import { watch } from "chokidar";
import { resolve } from "path";
import { generateTypes } from "./generate";

export function watchEndpoints() {
  const endpointsDir = resolve(process.cwd(), "endpoints");

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
