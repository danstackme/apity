import { mkdir, writeFile } from "fs/promises";
import { OpenAPIV3 } from "openapi-types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  convertToOpenAPI3,
  generateRoutes,
  isReferenceObject,
} from "../scripts/import-openapi";

// Set test environment
process.env.NODE_ENV = "test";

// Mock Commander to prevent CLI execution
vi.mock("commander", () => ({
  Command: vi.fn().mockReturnValue({
    name: vi.fn().mockReturnThis(),
    description: vi.fn().mockReturnThis(),
    argument: vi.fn().mockReturnThis(),
    option: vi.fn().mockReturnThis(),
    parse: vi.fn(),
    opts: vi.fn().mockReturnValue({}),
    args: [],
  }),
}));

// Mock fs/promises
vi.mock("fs/promises", () => {
  const mocked = {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(""),
  };
  return {
    default: mocked,
    ...mocked,
  };
});

// Helper to create valid OpenAPI operation objects
const createOperation = (
  params: OpenAPIV3.ParameterObject[] = [],
  responseSchema: OpenAPIV3.SchemaObject = { type: "object", properties: {} },
  description: string = "Successful response"
): OpenAPIV3.OperationObject => ({
  responses: {
    "200": {
      description,
      content: {
        "application/json": {
          schema: responseSchema,
        },
      },
    },
  },
  parameters: params,
});

describe("import-openapi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("convertToOpenAPI3", () => {
    it("should return the document as-is if it is already OpenAPI 3", async () => {
      const doc = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
      };
      const result = await convertToOpenAPI3(doc);
      expect(result).toEqual(doc);
    });

    it("should convert Swagger 2.0 to OpenAPI 3", async () => {
      const doc = {
        swagger: "2.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            get: {
              responses: {
                "200": {
                  description: "OK",
                  schema: { type: "string" },
                },
              },
            },
          },
        },
      };
      const result = await convertToOpenAPI3(doc);
      expect(result.openapi).toMatch(/^3\./);
    });
  });

  describe("isReferenceObject", () => {
    it("should return true for reference objects", () => {
      expect(isReferenceObject({ $ref: "#/components/schemas/Test" })).toBe(
        true
      );
    });

    it("should return false for non-reference objects", () => {
      expect(isReferenceObject({ type: "object" })).toBe(false);
    });
  });

  describe("generateRoutes", () => {
    const testSpec: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Test API", version: "1.0.0" },
      paths: {
        "/users": {
          get: {
            responses: {
              "200": {
                description: "Successful response",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
            parameters: [
              {
                in: "query",
                name: "limit",
                required: true,
                schema: { type: "number" },
              },
              {
                in: "query",
                name: "offset",
                required: false,
                schema: { type: "number" },
              },
            ],
          },
          post: {
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                    },
                  },
                },
              },
            },
            responses: {
              "200": {
                description: "Successful response",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    it("should generate routes correctly", async () => {
      await generateRoutes(testSpec, { outDir: "src" });

      // Verify mkdir was called
      expect(mkdir).toHaveBeenCalledWith("src", { recursive: true });

      // Verify writeFile was called with correct content
      expect(writeFile).toHaveBeenCalledWith(
        "src/endpoints.ts",
        expect.stringContaining("'/users'")
      );
      expect(writeFile).toHaveBeenCalledWith(
        "src/endpoints.ts",
        expect.stringContaining("GET: createApiEndpoint")
      );
      expect(writeFile).toHaveBeenCalledWith(
        "src/endpoints.ts",
        expect.stringContaining("POST: createApiEndpoint")
      );
    });

    it("should handle paths with parameters", async () => {
      const specWithParams: OpenAPIV3.Document = {
        ...testSpec,
        paths: {
          "/users/{id}": {
            get: {
              parameters: [
                {
                  in: "path",
                  name: "id",
                  required: true,
                  schema: { type: "string" },
                },
              ],
              responses: {
                "200": {
                  description: "Successful response",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      await generateRoutes(specWithParams, { outDir: "src" });

      expect(writeFile).toHaveBeenCalledWith(
        "src/endpoints.ts",
        expect.stringContaining("'/users/[id]'")
      );
    });

    it("should handle required query parameters", async () => {
      const spec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/users": {
            get: createOperation([
              {
                in: "query",
                name: "limit",
                required: true,
                schema: { type: "number" },
              },
            ]),
          } as OpenAPIV3.PathItemObject,
        },
      };

      await generateRoutes(spec, { outDir: "src" });

      expect(writeFile).toHaveBeenCalledWith(
        "src/endpoints.ts",
        expect.stringContaining('"limit":{"type":"number"}')
      );
    });

    it("should handle optional query parameters", async () => {
      const spec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/users": {
            get: createOperation([
              {
                in: "query",
                name: "offset",
                required: false,
                schema: { type: "number" },
              },
            ]),
          } as OpenAPIV3.PathItemObject,
        },
      };

      await generateRoutes(spec, { outDir: "src" });

      expect(writeFile).toHaveBeenCalledWith(
        "src/endpoints.ts",
        expect.stringContaining('"offset":{"type":"number"}')
      );
    });

    it("should handle mixed required and optional parameters", async () => {
      const spec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/users/{id}/posts": {
            get: createOperation([
              {
                in: "path",
                name: "id",
                required: true,
                schema: { type: "string" },
              },
              {
                in: "query",
                name: "page",
                required: true,
                schema: { type: "number" },
              },
              {
                in: "query",
                name: "filter",
                required: false,
                schema: { type: "string" },
              },
            ]),
          } as OpenAPIV3.PathItemObject,
        },
      };

      await generateRoutes(spec, { outDir: "src" });

      const writeFileCall = vi.mocked(writeFile).mock.calls[0][1] as string;

      expect(writeFileCall).toContain("'/users/[id]/posts'");
      expect(writeFileCall).toContain('"page":{"type":"number"}');
      expect(writeFileCall).toContain('"filter":{"type":"string"}');
    });

    it("should handle parameters with default values", async () => {
      const spec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/users": {
            get: createOperation([
              {
                in: "query",
                name: "limit",
                schema: {
                  type: "number",
                  default: 10,
                },
              },
            ]),
          } as OpenAPIV3.PathItemObject,
        },
      };

      await generateRoutes(spec, { outDir: "src" });

      expect(writeFile).toHaveBeenCalledWith(
        "src/endpoints.ts",
        expect.stringContaining('"limit":{"type":"number","default":10}')
      );
    });

    it("should handle required array parameters", async () => {
      const spec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/users": {
            get: createOperation([
              {
                in: "query",
                name: "ids",
                required: true,
                schema: {
                  type: "array",
                  items: { type: "string" },
                },
              },
            ]),
          } as OpenAPIV3.PathItemObject,
        },
      };

      await generateRoutes(spec, { outDir: "src" });

      expect(writeFile).toHaveBeenCalledWith(
        "src/endpoints.ts",
        expect.stringContaining(
          '"ids":{"type":"array","items":{"type":"string"}}'
        )
      );
    });
  });
});
