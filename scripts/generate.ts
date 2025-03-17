import { glob } from "glob";
import * as path from "path";
import * as fs from "fs/promises";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

type RouteConfig = {
  pattern: string;
  outputPath: string;
  outputType: string;
  ignore?: string[];
  baseDir: string;
};

const ROUTE_CONFIGS: RouteConfig[] = [
  {
    pattern: "src/routes/**/*.{ts,tsx}",
    outputPath: "src/generated/apiTree.gen.ts",
    outputType: "ApiTree",
    ignore: ["**/*.test.*", "**/*.spec.*"],
    baseDir: "src/routes",
  },
  {
    pattern: "tests/fixtures/routes/**/*.{ts,tsx}",
    outputPath: "tests/fixtures/generated/apiTree.gen.ts",
    outputType: "GeneratedApiTree",
    baseDir: "tests/fixtures/routes",
  },
];

async function generateApiTypes(config: RouteConfig) {
  // Find all route files
  const files = await glob(config.pattern, {
    cwd: ROOT_DIR,
    ignore: config.ignore,
  });

  let output = `// Generated by @danstackme/apity
// @ts-expect-error - Type-only import, will be available at runtime
import type { ApiEndpoint } from '${
    config.outputPath.includes("tests") ? "../../../src/types" : "../types"
  }';\n\n`;

  const routes = new Map<string, Set<string>>();

  // Process route files
  for (const file of files) {
    const fileContent = await fs.readFile(path.join(ROOT_DIR, file), "utf-8");
    const exportedMethods = fileContent.match(/export const (\w+)/g) || [];
    const methods = new Set<string>();

    for (const method of exportedMethods) {
      methods.add(method.replace("export const ", ""));
    }

    // Get the route path relative to the base directory
    const routePath = path
      .relative(config.baseDir, file)
      .replace(/\.(ts|tsx)$/, "")
      .replace(/\\/g, "/");

    const apiPath = routePath.split("/").filter(Boolean).join("/");

    routes.set("/" + apiPath, methods);
  }

  // Generate type definitions
  output += `export type ${config.outputType} = {\n`;
  for (const [path, methods] of routes) {
    const displayPath = path.replace(/\/index$/, "");
    output += `  "${displayPath}": {\n`;
    for (const method of methods) {
      const importStatement = `"../routes${path}"`;
      output += `    ${method}: typeof import(${importStatement}).${method};\n`;
    }
    output += `  };\n`;
  }
  output += "};\n";

  // Create the generated directory if it doesn't exist
  const outputDir = path.dirname(path.join(ROOT_DIR, config.outputPath));
  await fs.mkdir(outputDir, { recursive: true });

  // Write the generated file
  await fs.writeFile(path.join(ROOT_DIR, config.outputPath), output);
}

async function generateTypes() {
  for (const config of ROUTE_CONFIGS) {
    await generateApiTypes(config);
  }
}

export { generateTypes };

if (require.main === module) {
  generateTypes().catch(console.error);
}
