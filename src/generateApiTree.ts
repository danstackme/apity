import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { z } from "zod";
import { createApiEndpoint } from "./createApi";
import type { ApiRouteDefinition } from "./types";

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

const endpointSchema = z.object({
  method: z.enum(HTTP_METHODS),
  responseSchema: z.any().optional(),
  bodySchema: z.any().optional(),
  querySchema: z.any().optional(),
});

function generateApiTree(endpointsDir: string): ApiRouteDefinition {
  const apiTree: ApiRouteDefinition = {};

  function processDirectory(dir: string, basePath: string = "") {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relativePath = join(basePath, entry.name);

      if (entry.isDirectory()) {
        processDirectory(fullPath, relativePath);
        continue;
      }

      if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx")) {
        continue;
      }

      const fileContent = readFileSync(fullPath, "utf-8");
      const endpointMatch = fileContent.match(
        /export\s+default\s+({[\s\S]*?})/
      );

      if (!endpointMatch) {
        continue;
      }

      try {
        const endpointConfig = JSON.parse(endpointMatch[1]);
        const validatedConfig = endpointSchema.parse(endpointConfig);

        const path = relativePath
          .replace(/\.(ts|tsx)$/, "")
          .replace(/\\/g, "/")
          .replace(/index$/, "");

        if (!apiTree[path]) {
          apiTree[path] = {};
        }

        apiTree[path][validatedConfig.method] = createApiEndpoint({
          method: validatedConfig.method,
          responseSchema: validatedConfig.responseSchema,
          bodySchema: validatedConfig.bodySchema,
          querySchema: validatedConfig.querySchema,
        });
      } catch (error) {
        console.error(`Error processing ${fullPath}:`, error);
      }
    }
  }

  processDirectory(endpointsDir);
  return apiTree;
}

export function generateApiTreeFile(endpointsDir: string, outputFile: string) {
  const apiTree = generateApiTree(endpointsDir);
  const apiTreeContent = `// This file is auto-generated. Do not edit manually.
import type { ApiRouteDefinition } from "../types";

export const apiTree: ApiRouteDefinition = ${JSON.stringify(apiTree, null, 2)};
`;

  writeFileSync(outputFile, apiTreeContent);
}
