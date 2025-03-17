#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const setupConsumer = () => {
  try {
    // Read the package.json
    const packageJsonPath = resolve(process.cwd(), "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

    // Update the start script to include type generation
    if (packageJson.scripts?.start) {
      packageJson.scripts.start = `apity-generate && ${packageJson.scripts.start}`;
    } else {
      packageJson.scripts = {
        ...packageJson.scripts,
        start: "apity-generate && react-scripts start",
      };
    }

    // Write the updated package.json
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    console.log("✅ Added type generation to start script!");
  } catch (error) {
    console.error("❌ Failed to update package.json:", error);
    process.exit(1);
  }
};

setupConsumer();
