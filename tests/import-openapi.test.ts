import { writeFile } from "fs/promises";
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

// Mock process.exit
const _mockExit = vi
  .spyOn(process, "exit")
  .mockImplementation(() => undefined as never);

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
  description: string = "Successful response",
  requestBody?: OpenAPIV3.RequestBodyObject
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
  ...(requestBody && { requestBody }),
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
        paths: {},
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

    it("should handle invalid OpenAPI documents", async () => {
      const invalidDoc = {
        invalid: true,
      };
      await expect(convertToOpenAPI3(invalidDoc)).rejects.toThrow();
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
          get: createOperation(
            [
              {
                in: "query",
                name: "limit",
                required: true,
                schema: { type: "number" },
              },
              {
                in: "query",
                name: "offset",
                schema: { type: "number" },
              },
            ],
            {
              type: "object",
              properties: {
                users: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["id", "name"],
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                      email: {
                        type: "string",
                        format: "email",
                        nullable: true,
                      },
                    },
                  },
                },
              },
            }
          ),
          post: createOperation(
            [],
            { type: "object", properties: { id: { type: "string" } } },
            "Created user",
            {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["name"],
                    properties: {
                      name: { type: "string" },
                      email: { type: "string", format: "email" },
                    },
                  },
                },
              },
            }
          ),
        },
      },
    };

    it("should separate GET and non-GET routes correctly", async () => {
      await generateRoutes(testSpec, { outDir: "src" });

      const writeFileCall = vi.mocked(writeFile).mock.calls[0][1] as string;

      // GET endpoint should be in fetchEndpoints
      expect(writeFileCall).toMatch(/const GET_users = createApiEndpoint/);
      expect(writeFileCall).toMatch(
        /export const fetchEndpoints = {\s*'\/users': \[GET_users\]/
      );

      // POST endpoint should be in mutateEndpoints
      expect(writeFileCall).toMatch(/const POST_users = createApiEndpoint/);
      expect(writeFileCall).toMatch(
        /export const mutateEndpoints = {\s*'\/users': \[POST_users\]/
      );
    });

    it("should generate correct Zod schemas", async () => {
      await generateRoutes(testSpec, { outDir: "src" });

      const writeFileCall = vi.mocked(writeFile).mock.calls[0][1] as string;

      // Check GET endpoint schemas
      expect(writeFileCall).toMatch(
        /response: z\.object\({\s*users: z\.array\(z\.object\({\s*id: z\.string\(\),\s*name: z\.string\(\),\s*email: z\.string\(\)\.email\(\)\.nullable\(\)\.optional\(\)\s*}\)\)\.optional\(\)\s*}\)/
      );
      expect(writeFileCall).toMatch(
        /query: z\.object\({\s*limit: z\.number\(\)\.optional\(\),\s*offset: z\.number\(\)\.optional\(\)\s*}\)/
      );

      // Check POST endpoint schemas
      expect(writeFileCall).toMatch(
        /body: z\.object\({\s*name: z\.string\(\),\s*email: z\.string\(\)\.email\(\)\.optional\(\)\s*}\)/
      );
    });

    it("should handle path parameters correctly", async () => {
      const specWithParams: OpenAPIV3.Document = {
        ...testSpec,
        paths: {
          "/users/{id}/posts": {
            get: createOperation(
              [
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
                  schema: { type: "number", minimum: 1 },
                },
              ],
              {
                type: "object",
                properties: {
                  posts: { type: "array", items: { type: "string" } },
                },
              }
            ),
          },
        },
      };

      await generateRoutes(specWithParams, { outDir: "src" });

      const writeFileCall = vi.mocked(writeFile).mock.calls[0][1] as string;

      // Check path parameter handling
      expect(writeFileCall).toMatch(
        /const GET_usersposts_id = createApiEndpoint/
      );
      expect(writeFileCall).toMatch(
        /query: z\.object\({\s*page: z\.number\(\)\.min\(1\)\.optional\(\)\s*}\)/
      );
      expect(writeFileCall).toMatch(
        /response: z\.object\({\s*posts: z\.array\(z\.string\(\)\)\.optional\(\)\s*}\)/
      );
    });

    it("should handle empty paths", async () => {
      const emptySpec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
      };

      await generateRoutes(emptySpec, { outDir: "src" });
      const writeFileCall = vi.mocked(writeFile).mock.calls[0][1] as string;
      expect(writeFileCall).toMatch(/export const fetchEndpoints = {/);
      expect(writeFileCall).toMatch(/export const mutateEndpoints = {/);
    });

    it("should handle missing paths", async () => {
      const noPathsSpec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
      };

      await generateRoutes(noPathsSpec, { outDir: "src" });
      const writeFileCall = vi.mocked(writeFile).mock.calls[0][1] as string;
      expect(writeFileCall).toMatch(/export const fetchEndpoints = {/);
      expect(writeFileCall).toMatch(/export const mutateEndpoints = {/);
    });

    it("should handle missing operation objects", async () => {
      const emptyOperationSpec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            parameters: [],
          },
        },
      };

      await generateRoutes(emptyOperationSpec, { outDir: "src" });
      const writeFileCall = vi.mocked(writeFile).mock.calls[0][1] as string;
      expect(writeFileCall).toMatch(/export const fetchEndpoints = {/);
      expect(writeFileCall).toMatch(/export const mutateEndpoints = {/);
    });

    it("should handle missing response content", async () => {
      const noContentSpec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            get: {
              responses: {
                "200": {
                  description: "OK",
                  content: {},
                },
              },
            },
          },
        },
      };

      await generateRoutes(noContentSpec, { outDir: "src" });
      const writeFileCall = vi.mocked(writeFile).mock.calls[0][1] as string;
      expect(writeFileCall).toMatch(/response: z\.void\(\)/);
    });

    it("should handle missing request body content", async () => {
      const noBodyContentSpec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            post: {
              responses: {
                "200": {
                  description: "OK",
                  content: {},
                },
              },
              requestBody: {
                description: "Test body",
                content: {},
                required: false,
              },
            },
          },
        },
      };

      await generateRoutes(noBodyContentSpec, { outDir: "src" });
      const writeFileCall = vi.mocked(writeFile).mock.calls[0][1] as string;
      expect(writeFileCall).toMatch(/const POST_test = createApiEndpoint/);
    });

    it("should handle various schema types", async () => {
      const schemaSpec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            get: createOperation(
              [
                {
                  in: "query",
                  name: "enumParam",
                  schema: { type: "string", enum: ["a", "b", "c"] },
                },
                {
                  in: "query",
                  name: "dateParam",
                  schema: { type: "string", format: "date-time" },
                },
                {
                  in: "query",
                  name: "numberParam",
                  schema: { type: "number", minimum: 0, maximum: 100 },
                },
                {
                  in: "query",
                  name: "boolParam",
                  schema: { type: "boolean" },
                },
                {
                  in: "query",
                  name: "unknownParam",
                  schema: { type: "string" },
                },
              ],
              {
                type: "object",
                properties: {
                  nullableField: { type: "string", nullable: true },
                  arrayWithoutItems: {
                    type: "array",
                    items: { type: "string" },
                  },
                  emptyObject: { type: "object" },
                },
              }
            ),
          },
        },
      };

      await generateRoutes(schemaSpec, { outDir: "src" });
      const writeFileCall = vi.mocked(writeFile).mock.calls[0][1] as string;

      // Check enum handling
      expect(writeFileCall).toMatch(/z\.enum\(\['a', 'b', 'c'\]\)/);
      // Check date-time format
      expect(writeFileCall).toMatch(/z\.string\(\)\.datetime\(\)/);
      // Check number with min/max
      expect(writeFileCall).toMatch(/z\.number\(\)\.min\(0\)\.max\(100\)/);
      // Check boolean
      expect(writeFileCall).toMatch(/z\.boolean\(\)/);
      // Check unknown type
      expect(writeFileCall).toMatch(/z\.string\(\)\.nullable\(\)/);
      // Check array without items
      expect(writeFileCall).toMatch(/z\.array\(z\.string\(\)\)\.optional\(\)/);
      // Check empty object
      expect(writeFileCall).toMatch(/z\.object\(\{\}\)\.optional\(\)/);
    });

    it("should handle reference objects", async () => {
      const refSpec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            get: {
              responses: {
                "200": {
                  description: "OK",
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/Test" },
                    },
                  },
                },
              },
              requestBody: {
                $ref: "#/components/requestBodies/Test",
              },
              parameters: [
                {
                  $ref: "#/components/parameters/Test",
                },
              ],
            },
          },
        },
      };

      await generateRoutes(refSpec, { outDir: "src" });
      const writeFileCall = vi.mocked(writeFile).mock.calls[0][1] as string;
      expect(writeFileCall).toContain("response: z.void()");
    });

    it("should handle invalid parameter objects", async () => {
      const invalidParamSpec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            get: createOperation(
              [
                {
                  in: "query",
                  name: "test",
                  schema: { type: "string" },
                },
                {
                  in: "query",
                  name: "test2",
                  schema: { type: "string" },
                },
              ],
              { type: "string" }
            ),
          },
        },
      };

      await generateRoutes(invalidParamSpec, { outDir: "src" });
      const writeFileCall = vi.mocked(writeFile).mock.calls[0][1] as string;
      expect(writeFileCall).toMatch(/const GET_test = createApiEndpoint/);
    });
  });
});
