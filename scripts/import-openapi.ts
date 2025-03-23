#!/usr/bin/env node
import { Command } from "commander";
import { mkdir, readFile, writeFile } from "fs/promises";
import yaml from "yaml";
import swagger2openapi from "swagger2openapi";
import type { OpenAPIV3 } from "openapi-types";

interface GenerateOptions {
  outDir?: string;
}

export async function convertToOpenAPI3(doc: any): Promise<OpenAPIV3.Document> {
  if (doc.openapi && doc.openapi.startsWith("3.")) {
    return doc as OpenAPIV3.Document;
  }

  const result = await swagger2openapi.convert(doc, {});
  return result.openapi;
}

export function isReferenceObject(obj: any): obj is OpenAPIV3.ReferenceObject {
  return obj && "$ref" in obj;
}

export async function generateRoutes(
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

      // Extract path parameters
      const pathParams =
        operation.parameters?.filter((p) => {
          if (!p || typeof p === "string") return false;
          return "in" in p && p.in === "path";
        }) || [];

      if (pathParams.length > 0) {
        methods[upperMethod].params = {
          type: "object",
          properties: Object.fromEntries(
            pathParams.map((p) => [
              "name" in p ? p.name : "",
              "schema" in p ? p.schema : {},
            ])
          ),
        };
      }
    }

    routes.set(routePath, methods);
  }

  await generateSingleFile(
    routes,
    options.outDir || "src",
    spec.servers?.[0]?.url || ""
  );
}

// Add helper function to convert OpenAPI schema to Zod type
function convertToZodSchema(
  schema: OpenAPIV3.SchemaObject | undefined,
  _isRequired = false
): string {
  if (!schema) return "z.void()";

  let numberType: string;
  let itemType: string;
  let properties: string[];
  let zodSchema: string;

  switch (schema.type) {
    case "string":
      if (schema.enum) {
        zodSchema = `z.enum([${schema.enum.map((e) => `'${e}'`).join(", ")}])`;
      } else if (schema.format === "date-time") {
        zodSchema = "z.string().datetime()";
      } else if (schema.format === "email") {
        zodSchema = "z.string().email()";
      } else {
        zodSchema = "z.string()";
      }
      break;

    case "number":
    case "integer":
      numberType = "z.number()";
      if (schema.minimum !== undefined) {
        numberType += `.min(${schema.minimum})`;
      }
      if (schema.maximum !== undefined) {
        numberType += `.max(${schema.maximum})`;
      }
      zodSchema = numberType;
      break;

    case "boolean":
      zodSchema = "z.boolean()";
      break;

    case "array":
      if (schema.items) {
        itemType = convertToZodSchema(
          schema.items as OpenAPIV3.SchemaObject,
          true
        );
        zodSchema = `z.array(${itemType})`;
      } else {
        zodSchema = "z.array(z.unknown())";
      }
      break;

    case "object":
      if (!schema.properties) return "z.object({})";

      properties = Object.entries(schema.properties).map(([key, prop]) => {
        const propIsRequired = schema.required?.includes(key);
        const propType = convertToZodSchema(
          prop as OpenAPIV3.SchemaObject,
          propIsRequired
        );
        return `${key}: ${propIsRequired ? propType : `${propType}.optional()`}`;
      });

      zodSchema = `z.object({\n        ${properties.join(",\n        ")}\n      })`;
      break;

    default:
      zodSchema = "z.unknown()";
  }

  if (schema.nullable) {
    zodSchema += ".nullable()";
  }

  return zodSchema;
}

export async function generateSingleFile(
  routes: Map<string, Record<string, any>>,
  outDir: string,
  baseUrl: string
) {
  await mkdir(outDir, { recursive: true });

  const getRoutes = new Map<string, Map<string, any>>();
  const otherRoutes = new Map<string, Map<string, any>>();

  // Separate GET methods from other methods
  for (const [path, methods] of routes) {
    for (const [method, schema] of Object.entries(methods)) {
      if (method === "GET") {
        if (!getRoutes.has(path)) {
          getRoutes.set(path, new Map());
        }
        getRoutes.get(path)?.set(method, schema);
      } else {
        if (!otherRoutes.has(path)) {
          otherRoutes.set(path, new Map());
        }
        otherRoutes.get(path)?.set(method, schema);
      }
    }
  }

  let content = `import { createApi, createApiEndpoint } from './createApi';\n`;
  content += `import { z } from 'zod';\n\n`;

  const fetchEndpointNames = new Map<string, string[]>();

  for (const [path, methods] of getRoutes) {
    const endpointNames = [];

    for (const [method, schema] of methods) {
      const pathParams = Object.keys(schema.params.properties || {});
      const endpointName = `${method}_${path.replace(/\//g, "").replace(/\[.*?\]/g, "")}${pathParams.length > 0 ? `_${pathParams.join("_")}` : ""}`;
      endpointNames.push(endpointName);

      content += `const ${endpointName} = createApiEndpoint({\n`;
      content += `  method: '${method}',\n`;

      // Convert response schema
      if (Object.keys(schema.response).length > 0) {
        content += `  response: ${convertToZodSchema(schema.response, true)},\n`;
      } else {
        content += `  response: z.void(),\n`;
      }

      // Convert query parameters
      if (Object.keys(schema.query).length > 0) {
        content += `  query: ${convertToZodSchema(schema.query)},\n`;
      }

      content += `});\n\n`;
    }

    if (endpointNames.length > 0) {
      fetchEndpointNames.set(path, endpointNames);
    }
  }

  const mutateEndpointNames = new Map<string, string[]>();

  for (const [path, methods] of otherRoutes) {
    const endpointNames = [];

    for (const [method, schema] of methods) {
      const pathParams = Object.keys(schema.params.properties || {});
      const endpointName = `${method}_${path.replace(/\//g, "").replace(/\[.*?\]/g, "")}${pathParams.length > 0 ? `_${pathParams.join("_")}` : ""}`;
      endpointNames.push(endpointName);

      content += `const ${endpointName} = createApiEndpoint({\n`;
      content += `  method: '${method}',\n`;

      // Convert response schema
      if (Object.keys(schema.response).length > 0) {
        content += `  response: ${convertToZodSchema(schema.response, true)},\n`;
      } else {
        content += `  response: z.void(),\n`;
      }

      // Convert request body schema
      if (Object.keys(schema.body).length > 0) {
        content += `  body: ${convertToZodSchema(schema.body)},\n`;
      }

      // Convert query parameters
      if (Object.keys(schema.query).length > 0) {
        content += `  query: ${convertToZodSchema(schema.query)},\n`;
      }

      content += `});\n\n`;
    }

    if (endpointNames.length > 0) {
      mutateEndpointNames.set(path, endpointNames);
    }
  }

  content += `export const fetchEndpoints = {\n`;
  for (const [path, endpointNames] of fetchEndpointNames) {
    content += `  '${path}': [${endpointNames.join(", ")}],\n`;
  }
  content += `} as const;\n\n`;

  content += `export const mutateEndpoints = {\n`;
  for (const [path, endpointNames] of mutateEndpointNames) {
    content += `  '${path}': [${endpointNames.join(", ")}],\n`;
  }
  content += `} as const;\n\n`;

  content += `export const api = createApi({\n`;
  content += `  baseUrl: '${baseUrl}',\n`;
  content += `  fetchEndpoints,\n`;
  content += `  mutateEndpoints,\n`;
  content += `});\n`;

  await writeFile(`${outDir}/endpoints.ts`, content);
}

async function main() {
  const program = new Command();

  program
    .name("import-openapi")
    .description("Import OpenAPI/Swagger specification and generate API routes")
    .argument("<file>", "OpenAPI/Swagger specification file (JSON or YAML)")
    .option("-d, --outDir <directory>", "Output directory", undefined);

  program.parse();

  const options = program.opts();
  const [file] = program.args;

  try {
    const content = await readFile(file, "utf-8");
    const doc =
      file.endsWith(".yaml") || file.endsWith(".yml")
        ? yaml.parse(content)
        : JSON.parse(content);

    const openapi = await convertToOpenAPI3(doc);
    await generateRoutes(openapi, {
      outDir: options.outDir,
    });

    console.log("Successfully generated API routes!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

// Only run main() if not in test mode
if (process.env.NODE_ENV !== "test") {
  main();
}
