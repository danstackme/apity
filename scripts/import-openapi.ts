#!/usr/bin/env node
import { Command } from "commander";
import fs from "fs/promises";
import yaml from "yaml";
import swagger2openapi from "swagger2openapi";
import type { OpenAPIV3 } from "openapi-types";

interface GenerateOptions {
  output: "file-based" | "single-file";
  outDir?: string;
}

async function convertToOpenAPI3(doc: any): Promise<OpenAPIV3.Document> {
  if (doc.openapi && doc.openapi.startsWith("3.")) {
    return doc as OpenAPIV3.Document;
  }

  const result = await swagger2openapi.convert(doc, {});
  return result.openapi;
}

function isReferenceObject(obj: any): obj is OpenAPIV3.ReferenceObject {
  return obj && "$ref" in obj;
}

async function generateRoutes(
  spec: OpenAPIV3.Document,
  options: GenerateOptions
) {
  const routes = new Map<string, Record<string, any>>();

  // Process each path in the OpenAPI spec
  for (const [path, pathItem] of Object.entries(spec.paths || {})) {
    if (!pathItem) continue;

    const routePath = path.replace(/{([^}]+)}/g, "[$1]");
    const methods: Record<string, any> = {};

    // Process each HTTP method
    for (const [method, operation] of Object.entries(pathItem)) {
      if (
        method === "parameters" ||
        !operation ||
        typeof operation === "string" ||
        Array.isArray(operation)
      )
        continue;

      const upperMethod = method.toUpperCase();
      const response = operation.responses?.[200];
      const requestBody = operation.requestBody;

      methods[upperMethod] = {
        method: upperMethod,
        response:
          !response || isReferenceObject(response)
            ? {}
            : response.content?.["application/json"]?.schema || {},
        body:
          !requestBody || isReferenceObject(requestBody)
            ? {}
            : requestBody.content?.["application/json"]?.schema || {},
        query: {},
        params: {},
      };

      // Extract query parameters
      const queryParams =
        operation.parameters?.filter((p) => {
          if (!p || typeof p === "string") return false;
          return "in" in p && p.in === "query";
        }) || [];

      if (queryParams.length > 0) {
        methods[upperMethod].query = {
          type: "object",
          properties: Object.fromEntries(
            queryParams.map((p) => {
              if (typeof p === "string" || isReferenceObject(p))
                return ["", {}];
              return ["name" in p ? p.name : "", "schema" in p ? p.schema : {}];
            })
          ),
        };
      }
    }

    routes.set(routePath, methods);
  }

  if (options.output === "file-based") {
    await generateFileBased(routes, options.outDir || "src/routes");
  } else {
    await generateSingleFile(routes, options.outDir || "src");
  }
}

async function generateFileBased(
  routes: Map<string, Record<string, any>>,
  outDir: string
) {
  await fs.mkdir(outDir, { recursive: true });

  for (const [path, methods] of routes) {
    const routePath = path.slice(1).replace(/\//g, ".").replace(/\[|\]/g, "_");
    const filePath = `${outDir}/${routePath}.ts`;

    let content = `import { createApiEndpoint } from '../createApi';\n`;
    content += `import { z } from 'zod';\n\n`;

    for (const [method, schema] of Object.entries(methods)) {
      content += `export const ${method} = createApiEndpoint({\n`;
      content += `  method: '${method}',\n`;

      if (Object.keys(schema.response).length > 0) {
        content += `  responseSchema: z.object(${JSON.stringify(
          schema.response.properties
        )}),\n`;
      }

      if (Object.keys(schema.body).length > 0) {
        content += `  bodySchema: z.object(${JSON.stringify(
          schema.body.properties
        )}),\n`;
      }

      if (Object.keys(schema.query).length > 0) {
        content += `  querySchema: z.object(${JSON.stringify(
          schema.query.properties
        )}),\n`;
      }

      content += `});\n\n`;
    }

    await fs.writeFile(filePath, content);
  }
}

async function generateSingleFile(
  routes: Map<string, Record<string, any>>,
  outDir: string
) {
  await fs.mkdir(outDir, { recursive: true });

  let content = `import { createApi, createApiEndpoint } from './createApi';\n`;
  content += `import { z } from 'zod';\n\n`;
  content += `export const api = createApi({\n`;
  content += `  apiTree: {\n`;

  for (const [path, methods] of routes) {
    content += `    '${path}': {\n`;

    for (const [method, schema] of Object.entries(methods)) {
      content += `      ${method}: createApiEndpoint({\n`;
      content += `        method: '${method}',\n`;

      if (Object.keys(schema.response).length > 0) {
        content += `        responseSchema: z.object(${JSON.stringify(
          schema.response.properties
        )}),\n`;
      }

      if (Object.keys(schema.body).length > 0) {
        content += `        bodySchema: z.object(${JSON.stringify(
          schema.body.properties
        )}),\n`;
      }

      if (Object.keys(schema.query).length > 0) {
        content += `        querySchema: z.object(${JSON.stringify(
          schema.query.properties
        )}),\n`;
      }

      content += `      }),\n`;
    }

    content += `    },\n`;
  }

  content += `  },\n`;
  content += `});\n`;

  await fs.writeFile(`${outDir}/generated-api.ts`, content);
}

async function main() {
  const program = new Command();

  program
    .name("import-openapi")
    .description("Import OpenAPI/Swagger specification and generate API routes")
    .argument("<file>", "OpenAPI/Swagger specification file (JSON or YAML)")
    .option(
      "-o, --output <type>",
      "Output type: file-based or single-file",
      "file-based"
    )
    .option("-d, --outDir <directory>", "Output directory", undefined);

  program.parse();

  const options = program.opts();
  const [file] = program.args;

  try {
    const content = await fs.readFile(file, "utf-8");
    const doc =
      file.endsWith(".yaml") || file.endsWith(".yml")
        ? yaml.parse(content)
        : JSON.parse(content);

    const openapi = await convertToOpenAPI3(doc);
    await generateRoutes(openapi, {
      output: options.output as "file-based" | "single-file",
      outDir: options.outDir,
    });

    console.log("Successfully generated API routes!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
