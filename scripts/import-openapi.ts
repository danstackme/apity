#!/usr/bin/env node
import { Command } from "commander";
import { mkdir, readFile, writeFile } from "fs/promises";
import swagger2openapi from "swagger2openapi";
import type { OpenAPIV3 } from "openapi-types";

// Simple YAML parser to avoid node:process dependency
function parseYaml(yamlString: string): any {
  try {
    // Very basic YAML parser for simple YAML structures
    const lines = yamlString.split("\n");
    const result: any = {};
    let currentObject = result;
    const stack: any[] = [result];
    let currentIndent = 0;
    let currentArray: any[] | null = null;
    let arrayIndent = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip empty lines and comments
      if (line.trim() === "" || line.trim().startsWith("#")) continue;

      // Calculate indent
      const indent = line.search(/\S/);
      if (indent < 0) continue;

      // Check if this is an array item
      if (line.trim().startsWith("-")) {
        // Array item
        const arrayItemMatch = line.trim().match(/^-\s*(.*)$/);
        if (!arrayItemMatch) continue;

        const value = arrayItemMatch[1].trim();

        // Starting a new array
        if (arrayIndent === -1 || indent !== arrayIndent) {
          // Find the array key from the previous line
          let j = i - 1;
          while (j >= 0) {
            const prevLine = lines[j].trim();
            if (prevLine === "" || prevLine.startsWith("#")) {
              j--;
              continue;
            }

            const keyMatch = prevLine.match(/^([\w-]+):(?:\s*)?$/);
            if (keyMatch) {
              const arrayKey = keyMatch[1];
              currentObject[arrayKey] = [];
              currentArray = currentObject[arrayKey];
              arrayIndent = indent;
              break;
            }
            j--;
          }
        }

        if (currentArray) {
          if (value === "") {
            // This is an object in the array
            const newObj = {};
            currentArray.push(newObj);
            stack.push(currentObject);
            currentObject = newObj;
            currentIndent = indent;
            currentArray = null; // We're now working with an object
          } else {
            // Simple value in array
            let parsedValue: any = value;
            if (parsedValue === "true") parsedValue = true;
            else if (parsedValue === "false") parsedValue = false;
            else if (!isNaN(Number(parsedValue)) && parsedValue !== "")
              parsedValue = Number(parsedValue);
            else if (parsedValue.startsWith("'") && parsedValue.endsWith("'"))
              parsedValue = parsedValue.slice(1, -1);
            else if (parsedValue.startsWith('"') && parsedValue.endsWith('"'))
              parsedValue = parsedValue.slice(1, -1);

            currentArray.push(parsedValue);
          }
        }
        continue;
      } else {
        // If we're back to regular objects after array
        if (indent <= arrayIndent) {
          arrayIndent = -1;
          currentArray = null;
        }
      }

      // Get key and value for objects
      const match = line.trim().match(/^([\w-]+):(?:\s(.+))?$/);
      if (!match) continue;

      const [_, key, value] = match;

      if (value === undefined || value.trim() === "") {
        // New object
        currentObject[key] = {};
        if (indent > currentIndent) {
          stack.push(currentObject);
          currentObject = currentObject[key];
          currentIndent = indent;
        } else if (indent < currentIndent) {
          // Go back up the stack
          while (stack.length > 1 && indent <= currentIndent) {
            stack.pop();
            currentObject = stack[stack.length - 1];
            currentIndent -= 2; // Assuming 2-space indentation
          }
          currentObject[key] = {};
          stack.push(currentObject);
          currentObject = currentObject[key];
        } else {
          currentObject = stack[stack.length - 1];
          currentObject[key] = {};
          currentObject = currentObject[key];
        }
      } else {
        // Simple key-value pair
        // Handle string, number, boolean values
        let parsedValue: any = value.trim();
        if (parsedValue === "true") parsedValue = true;
        else if (parsedValue === "false") parsedValue = false;
        else if (!isNaN(Number(parsedValue)) && parsedValue !== "")
          parsedValue = Number(parsedValue);
        else if (parsedValue.startsWith("'") && parsedValue.endsWith("'"))
          parsedValue = parsedValue.slice(1, -1);
        else if (parsedValue.startsWith('"') && parsedValue.endsWith('"'))
          parsedValue = parsedValue.slice(1, -1);

        currentObject[key] = parsedValue;
      }
    }

    return result;
  } catch (error) {
    console.error("Error parsing YAML:", error);
    throw error;
  }
}

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
  return obj !== null && obj !== undefined && "$ref" in obj;
}

// Function to extract the schema name from a reference
export function getRefName(ref: string): string {
  if (!ref) return "";
  const parts = ref.split("/");
  return parts[parts.length - 1];
}

// Function to resolve references in the OpenAPI schema
export function resolveRef(
  ref: string,
  spec: OpenAPIV3.Document
): OpenAPIV3.SchemaObject | undefined {
  if (!ref.startsWith("#/")) return undefined;

  const parts = ref.substring(2).split("/");
  let current: any = spec;

  for (const part of parts) {
    if (!current[part]) return undefined;
    current = current[part];
  }

  return current as OpenAPIV3.SchemaObject;
}

// Process schema definitions from the OpenAPI spec
export function processSchemaDefinitions(
  spec: OpenAPIV3.Document
): Map<string, OpenAPIV3.SchemaObject> {
  const schemas = new Map<string, OpenAPIV3.SchemaObject>();

  // Extract schemas from components section
  if (spec.components?.schemas) {
    for (const [name, schema] of Object.entries(spec.components.schemas)) {
      if (!isReferenceObject(schema)) {
        schemas.set(name, schema);
      }
    }
  }

  return schemas;
}

export async function generateRoutes(
  spec: OpenAPIV3.Document,
  options: GenerateOptions
) {
  const routes = new Map<string, Record<string, any>>();
  const schemas = processSchemaDefinitions(spec);

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
        response: processResponseSchema(response, spec),
        body: processRequestBodySchema(requestBody, spec),
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
    schemas,
    options.outDir || "src",
    spec.servers?.[0]?.url || ""
  );
}

// Process response schema and resolve any references
function processResponseSchema(
  response: OpenAPIV3.ReferenceObject | OpenAPIV3.ResponseObject | undefined,
  spec: OpenAPIV3.Document
): OpenAPIV3.SchemaObject {
  if (!response) return {};

  if (isReferenceObject(response)) {
    const resolvedSchema = resolveRef(response.$ref, spec);
    return resolvedSchema || {};
  }

  const contentSchema = response.content?.["application/json"]?.schema;

  if (!contentSchema) return {};

  if (isReferenceObject(contentSchema)) {
    const resolvedSchema = resolveRef(contentSchema.$ref, spec);
    return resolvedSchema || {};
  }

  // Process allOf if present in the schema
  if (contentSchema.allOf) {
    return processAllOf(contentSchema, spec);
  }

  // Process oneOf if present in the schema (keep as is for later Zod union conversion)
  if (contentSchema.oneOf) {
    return contentSchema;
  }

  return contentSchema;
}

// Process request body schema and resolve any references
function processRequestBodySchema(
  requestBody:
    | OpenAPIV3.ReferenceObject
    | OpenAPIV3.RequestBodyObject
    | undefined,
  spec: OpenAPIV3.Document
): OpenAPIV3.SchemaObject {
  if (!requestBody) return {};

  if (isReferenceObject(requestBody)) {
    const resolvedSchema = resolveRef(requestBody.$ref, spec);
    return resolvedSchema || {};
  }

  const contentSchema = requestBody.content?.["application/json"]?.schema;

  if (!contentSchema) return {};

  if (isReferenceObject(contentSchema)) {
    const resolvedSchema = resolveRef(contentSchema.$ref, spec);
    return resolvedSchema || {};
  }

  // Process allOf if present in the schema
  if (contentSchema.allOf) {
    return processAllOf(contentSchema, spec);
  }

  // Process oneOf if present in the schema (keep as is for later Zod union conversion)
  if (contentSchema.oneOf) {
    return contentSchema;
  }

  return contentSchema;
}

// Process allOf keyword by merging schemas
function processAllOf(
  schema: OpenAPIV3.SchemaObject,
  spec: OpenAPIV3.Document
): OpenAPIV3.SchemaObject {
  if (
    !schema.allOf ||
    !Array.isArray(schema.allOf) ||
    schema.allOf.length === 0
  ) {
    return schema;
  }

  // Create a copy of the schema without the allOf property
  const { allOf, ...baseSchema } = schema;
  const mergedSchema = { ...baseSchema };

  // Merge all sub-schemas
  for (const subSchema of allOf) {
    let resolvedSubSchema: OpenAPIV3.SchemaObject;

    if (isReferenceObject(subSchema)) {
      const resolved = resolveRef(subSchema.$ref, spec);
      if (!resolved) continue;
      resolvedSubSchema = resolved;
    } else {
      resolvedSubSchema = subSchema;
    }

    // Recursively process nested allOf
    if (resolvedSubSchema.allOf) {
      resolvedSubSchema = processAllOf(resolvedSubSchema, spec);
    }

    // Merge properties
    if (resolvedSubSchema.properties) {
      mergedSchema.properties = {
        ...mergedSchema.properties,
        ...resolvedSubSchema.properties,
      };
    }

    // Merge required fields
    if (resolvedSubSchema.required && resolvedSubSchema.required.length > 0) {
      mergedSchema.required = [
        ...(mergedSchema.required || []),
        ...resolvedSubSchema.required,
      ];
    }

    // Merge other attributes (type, format, etc.)
    if (resolvedSubSchema.type && !mergedSchema.type) {
      // @ts-expect-error - We're carefully handling schema type merging
      mergedSchema.type = resolvedSubSchema.type;
    }
    if (resolvedSubSchema.format && !mergedSchema.format) {
      mergedSchema.format = resolvedSubSchema.format;
    }
    if (resolvedSubSchema.description && !mergedSchema.description) {
      mergedSchema.description = resolvedSubSchema.description;
    }
  }

  return mergedSchema;
}

// Add helper function to convert OpenAPI schema to Zod type
function convertToZodSchema(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined,
  _isRequired = false,
  schemas: Map<string, OpenAPIV3.SchemaObject> = new Map()
): string {
  if (!schema) return "z.void()";

  // Handle reference objects
  if (isReferenceObject(schema)) {
    const refName = getRefName(schema.$ref);
    if (schemas.has(refName)) {
      // For referenced schemas, create a reusable Zod schema
      return `z.lazy(() => ${refName}Schema)`;
    }
    return "z.unknown()";
  }

  // Process allOf if present and didn't get merged earlier
  if (schema.allOf) {
    // Convert each subSchema in allOf to a Zod schema
    const allOfSchemas = schema.allOf.map((subSchema) =>
      convertToZodSchema(subSchema, _isRequired, schemas)
    );

    // For a single schema, just return it
    if (allOfSchemas.length === 1) {
      return allOfSchemas[0];
    }

    // For multiple schemas, nest the intersections
    // z.intersection takes exactly two arguments, so we need to nest them for 3+ schemas
    let result = `z.intersection(${allOfSchemas[0]}, ${allOfSchemas[1]})`;

    // Add additional schemas by nesting intersections
    for (let i = 2; i < allOfSchemas.length; i++) {
      result = `z.intersection(${result}, ${allOfSchemas[i]})`;
    }

    return result;
  }

  // Process oneOf schemas using Zod union
  if (schema.oneOf && schema.oneOf.length > 0) {
    // Convert each subSchema in oneOf to a Zod schema
    const oneOfSchemas = schema.oneOf.map((subSchema) =>
      convertToZodSchema(subSchema, _isRequired, schemas)
    );

    // For a single schema, just return it
    if (oneOfSchemas.length === 1) {
      return oneOfSchemas[0];
    }

    // For multiple schemas, use z.union
    // z.union([A, B]) is equivalent to A.or(B)
    return oneOfSchemas.reduce((acc, current, index) => {
      if (index === 0) return current;
      return `${acc}.or(${current})`;
    }, "");
  }

  let numberType: string;
  let itemType: string;
  let properties: string[];
  let zodSchema: string;

  // Handle nullable types using union type syntax
  if (Array.isArray(schema.type)) {
    if (schema.type.includes("null")) {
      const nonNullTypes = schema.type.filter((t) => t !== "null");
      if (nonNullTypes.length === 1) {
        const nonNullSchema = { ...schema, type: nonNullTypes[0] };
        return `${convertToZodSchema(nonNullSchema, _isRequired, schemas)}.nullable()`;
      }
    }
    // Default to string if multiple non-null types
    schema.type = "string";
  }

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
        if (schema.minLength !== undefined) {
          zodSchema += `.min(${schema.minLength})`;
        }
        if (schema.maxLength !== undefined) {
          zodSchema += `.max(${schema.maxLength})`;
        }
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
        itemType = convertToZodSchema(schema.items, true, schemas);
        zodSchema = `z.array(${itemType})`;
      } else {
        zodSchema = "z.array(z.unknown())";
      }
      break;

    case "object":
      if (!schema.properties) return "z.object({})";

      properties = Object.entries(schema.properties).map(([key, prop]) => {
        const propIsRequired = schema.required?.includes(key);
        const propType = convertToZodSchema(prop, propIsRequired, schemas);
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

  if (schema.description) {
    const escapedDescription = schema.description.replace(/[`'\\]/g, "\\$&");
    zodSchema += `.describe(\`${escapedDescription}\`)`;
  }

  return zodSchema;
}

export async function generateSingleFile(
  routes: Map<string, Record<string, any>>,
  schemas: Map<string, OpenAPIV3.SchemaObject>,
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

  let content = `import { createApi, createApiEndpoint } from '@danstackme/apity';\n`;
  content += `import { z } from 'zod';\n\n`;

  // Generate schema type definitions first
  if (schemas.size > 0) {
    content += `// Schema definitions\n`;
    for (const [name, schema] of schemas) {
      content += `export const ${name}Schema = ${convertToZodSchema(schema, true, schemas)};\n\n`;
    }
  }

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
        if (isReferenceObject(schema.response)) {
          const refName = getRefName(schema.response.$ref);
          content += `  response: ${refName}Schema,\n`;
        } else {
          content += `  response: ${convertToZodSchema(schema.response, true, schemas)},\n`;
        }
      } else {
        content += `  response: z.void(),\n`;
      }

      // Convert query parameters
      if (Object.keys(schema.query).length > 0) {
        content += `  query: ${convertToZodSchema(schema.query, false, schemas)},\n`;
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
        if (isReferenceObject(schema.response)) {
          const refName = getRefName(schema.response.$ref);
          content += `  response: ${refName}Schema,\n`;
        } else {
          content += `  response: ${convertToZodSchema(schema.response, true, schemas)},\n`;
        }
      } else {
        content += `  response: z.void(),\n`;
      }

      // Convert request body schema
      if (Object.keys(schema.body).length > 0) {
        if (isReferenceObject(schema.body)) {
          const refName = getRefName(schema.body.$ref);
          content += `  body: ${refName}Schema,\n`;
        } else {
          content += `  body: ${convertToZodSchema(schema.body, false, schemas)},\n`;
        }
      }

      // Convert query parameters
      if (Object.keys(schema.query).length > 0) {
        content += `  query: ${convertToZodSchema(schema.query, false, schemas)},\n`;
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
        ? parseYaml(content)
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
