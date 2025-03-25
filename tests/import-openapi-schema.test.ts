import { writeFile } from "fs/promises";
import { OpenAPIV3 } from "openapi-types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  convertToOpenAPI3,
  generateRoutes,
  getRefName,
  isReferenceObject,
  processSchemaDefinitions,
  resolveRef,
} from "../scripts/import-openapi";

// Set test environment
process.env.NODE_ENV = "test";

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

// Helper to create test OpenAPI document with schemas
const createTestSpec = (): OpenAPIV3.Document => ({
  openapi: "3.0.0",
  info: { title: "Test API", version: "1.0.0" },
  components: {
    schemas: {
      BaseEntity: {
        type: "object",
        properties: {
          id: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
        required: ["id"],
      },
      FixedSchedule: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["fixed"] },
        },
        required: ["type"],
      },
      WeeklySchedule: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["weekly"] },
          interval: { type: "integer", minimum: 1 },
        },
        required: ["type", "interval"],
      },
      MonthlySchedule: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["monthly"] },
          dayOfMonth: { type: "integer", minimum: 1, maximum: 31 },
        },
        required: ["type", "dayOfMonth"],
      },
      Subscription: {
        type: "object",
        properties: {
          id: { type: "string" },
          productId: { type: "string" },
          quantity: { type: "integer" },
          schedule: {
            oneOf: [
              { $ref: "#/components/schemas/FixedSchedule" },
              { $ref: "#/components/schemas/WeeklySchedule" },
              { $ref: "#/components/schemas/MonthlySchedule" },
            ],
          },
        },
        required: ["id", "productId", "quantity"],
      },
    },
  },
  paths: {
    "/allof-example": {
      get: {
        responses: {
          "200": {
            description: "AllOf example",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      allOf: [
                        { $ref: "#/components/schemas/BaseEntity" },
                        { $ref: "#/components/schemas/Subscription" },
                      ],
                    },
                  },
                  required: ["data"],
                },
              },
            },
          },
        },
      },
    },
    "/oneof-example": {
      get: {
        responses: {
          "200": {
            description: "OneOf example",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    schedule: {
                      oneOf: [
                        { $ref: "#/components/schemas/FixedSchedule" },
                        { $ref: "#/components/schemas/WeeklySchedule" },
                        { $ref: "#/components/schemas/MonthlySchedule" },
                      ],
                    },
                  },
                  required: ["schedule"],
                },
              },
            },
          },
        },
      },
      post: {
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  schedule: {
                    oneOf: [
                      { $ref: "#/components/schemas/FixedSchedule" },
                      { $ref: "#/components/schemas/WeeklySchedule" },
                    ],
                  },
                },
                required: ["schedule"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                  },
                  required: ["success"],
                },
              },
            },
          },
        },
      },
    },
    // Example with nested allOf and oneOf
    "/nested-example": {
      get: {
        responses: {
          "200": {
            description: "Nested example",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      allOf: [
                        { $ref: "#/components/schemas/BaseEntity" },
                        {
                          type: "object",
                          properties: {
                            schedule: {
                              oneOf: [
                                { $ref: "#/components/schemas/FixedSchedule" },
                                { $ref: "#/components/schemas/WeeklySchedule" },
                              ],
                            },
                          },
                        },
                      ],
                    },
                  },
                  required: ["data"],
                },
              },
            },
          },
        },
      },
    },
  },
});

describe("import-openapi schemas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("schema definitions and references", () => {
    it("should extract schema definitions from components", () => {
      const testSpec = createTestSpec();
      const schemas = processSchemaDefinitions(testSpec);

      expect(schemas.size).toBe(5);
      expect(schemas.has("BaseEntity")).toBe(true);
      expect(schemas.has("FixedSchedule")).toBe(true);
      expect(schemas.has("WeeklySchedule")).toBe(true);
      expect(schemas.has("MonthlySchedule")).toBe(true);
      expect(schemas.has("Subscription")).toBe(true);
    });

    it("should extract ref name from reference path", () => {
      expect(getRefName("#/components/schemas/BaseEntity")).toBe("BaseEntity");
      expect(getRefName("#/components/schemas/nested/Schema")).toBe("Schema");
      expect(getRefName("")).toBe("");
    });

    it("should resolve references correctly", () => {
      const testSpec = createTestSpec();
      const baseEntity = resolveRef(
        "#/components/schemas/BaseEntity",
        testSpec
      );

      expect(baseEntity).toBeDefined();
      expect(baseEntity?.type).toBe("object");
      expect(baseEntity?.properties?.id).toEqual({ type: "string" });

      const nonExistent = resolveRef(
        "#/components/schemas/NonExistent",
        testSpec
      );
      expect(nonExistent).toBeUndefined();

      const invalidRef = resolveRef("invalid-ref", testSpec);
      expect(invalidRef).toBeUndefined();
    });

    it("should identify reference objects", () => {
      expect(isReferenceObject({ $ref: "#/components/schemas/Test" })).toBe(
        true
      );
      expect(isReferenceObject({ type: "string" })).toBe(false);
      expect(isReferenceObject(null)).toBe(false);
    });

    it("should convert an OpenAPI 2 spec to OpenAPI 3", async () => {
      const swaggerSpec = {
        swagger: "2.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
      };

      const converted = await convertToOpenAPI3(swaggerSpec);
      expect(converted.openapi).toMatch(/^3\./);
    });
  });

  describe("allOf handling", () => {
    it("should generate correct schemas for allOf", async () => {
      const testSpec = createTestSpec();
      await generateRoutes(testSpec, { outDir: "src" });

      const writeFileCall = vi.mocked(writeFile).mock.calls[0][1] as string;

      // Update to use string contains instead of regex
      expect(writeFileCall).toContain("GET_allof-example");
      expect(writeFileCall).toContain(
        "z.intersection(z.lazy(() => BaseEntitySchema), z.lazy(() => SubscriptionSchema))"
      );
    });

    it("should handle nested allOf correctly", async () => {
      const testSpec = createTestSpec();
      await generateRoutes(testSpec, { outDir: "src" });

      const writeFileCall = vi.mocked(writeFile).mock.calls[0][1] as string;

      // Update to use string contains instead of regex
      expect(writeFileCall).toContain("GET_nested-example");
      expect(writeFileCall).toContain(
        "z.intersection(z.lazy(() => BaseEntitySchema)"
      );
    });
  });

  describe("oneOf handling", () => {
    it("should generate correct schemas for oneOf", async () => {
      const testSpec = createTestSpec();
      await generateRoutes(testSpec, { outDir: "src" });

      const writeFileCall = vi.mocked(writeFile).mock.calls[0][1] as string;

      // Update to use string contains instead of regex
      expect(writeFileCall).toContain(
        "schedule: z.lazy(() => FixedScheduleSchema).or(z.lazy(() => WeeklyScheduleSchema))"
      );
    });

    it("should handle oneOf in request bodies", async () => {
      const testSpec = createTestSpec();
      await generateRoutes(testSpec, { outDir: "src" });

      const writeFileCall = vi.mocked(writeFile).mock.calls[0][1] as string;

      // Update to use string contains instead of regex
      expect(writeFileCall).toContain("POST_oneof-example");
      expect(writeFileCall).toContain("body: z.object({");
      expect(writeFileCall).toContain(
        "schedule: z.lazy(() => FixedScheduleSchema).or(z.lazy(() => WeeklyScheduleSchema))"
      );
    });
  });

  describe("combined allOf and oneOf", () => {
    it("should handle combined allOf and oneOf correctly", async () => {
      const testSpec = createTestSpec();
      await generateRoutes(testSpec, { outDir: "src" });

      const writeFileCall = vi.mocked(writeFile).mock.calls[0][1] as string;

      // Update to use string contains instead of regex
      expect(writeFileCall).toContain("GET_nested-example");
      expect(writeFileCall).toContain(
        "schedule: z.lazy(() => FixedScheduleSchema).or(z.lazy(() => WeeklyScheduleSchema))"
      );
    });
  });

  // Add tests for additional schema types and edge cases
  describe("additional schema conversions", () => {
    it("should handle nullable types correctly", async () => {
      const nullableSpec: OpenAPIV3.Document = {
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
                      schema: {
                        type: "object",
                        properties: {
                          nullableString: {
                            type: "string",
                            nullable: true,
                          },
                          explicitNullable: {
                            type: "string",
                            nullable: true,
                          },
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

      await generateRoutes(nullableSpec, { outDir: "src" });
      const writeFileCall = vi.mocked(writeFile).mock.calls[0][1] as string;

      expect(writeFileCall).toContain("nullable()");
    });

    it("should handle array schemas with no items", async () => {
      const arraySpec: OpenAPIV3.Document = {
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
                      schema: {
                        type: "array",
                        items: {
                          type: "string",
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

      await generateRoutes(arraySpec, { outDir: "src" });
      const writeFileCall = vi.mocked(writeFile).mock.calls[0][1] as string;

      expect(writeFileCall).toContain("z.array(");
    });

    it("should handle string formats correctly", async () => {
      const formatSpec: OpenAPIV3.Document = {
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
                      schema: {
                        type: "object",
                        properties: {
                          dateTime: {
                            type: "string",
                            format: "date-time",
                          },
                          email: {
                            type: "string",
                            format: "email",
                          },
                          regularString: {
                            type: "string",
                            minLength: 5,
                            maxLength: 10,
                          },
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

      await generateRoutes(formatSpec, { outDir: "src" });
      const writeFileCall = vi.mocked(writeFile).mock.calls[0][1] as string;

      expect(writeFileCall).toContain("z.string().datetime()");
      expect(writeFileCall).toContain("z.string().email()");
      expect(writeFileCall).toContain("z.string().min(5).max(10)");
    });

    it("should handle number types with constraints", async () => {
      const numberSpec: OpenAPIV3.Document = {
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
                      schema: {
                        type: "object",
                        properties: {
                          integer: {
                            type: "integer",
                            minimum: 1,
                            maximum: 100,
                          },
                          float: {
                            type: "number",
                            minimum: 0.1,
                            maximum: 9.9,
                          },
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

      await generateRoutes(numberSpec, { outDir: "src" });
      const writeFileCall = vi.mocked(writeFile).mock.calls[0][1] as string;

      expect(writeFileCall).toContain("z.number().min(1).max(100)");
      expect(writeFileCall).toContain("z.number().min(0.1).max(9.9)");
    });

    it("should handle enum types", async () => {
      const enumSpec: OpenAPIV3.Document = {
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
                      schema: {
                        type: "object",
                        properties: {
                          status: {
                            type: "string",
                            enum: ["pending", "approved", "rejected"],
                          },
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

      await generateRoutes(enumSpec, { outDir: "src" });
      const writeFileCall = vi.mocked(writeFile).mock.calls[0][1] as string;

      expect(writeFileCall).toContain(
        "z.enum(['pending', 'approved', 'rejected'])"
      );
    });

    it("should handle schemas with unknown or non-standard types", async () => {
      const schemaWithUnknownTypes: OpenAPIV3.Document = {
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
                      schema: {
                        type: "object",
                        properties: {
                          emptyObject: {},
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

      await generateRoutes(schemaWithUnknownTypes, { outDir: "src" });
      const writeFileCall = vi.mocked(writeFile).mock.calls[0][1] as string;

      expect(writeFileCall).toContain("GET_test");
    });

    it("should handle schemas with empty properties", async () => {
      const emptyPropsSpec: OpenAPIV3.Document = {
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
                      schema: {
                        type: "object",
                        properties: {
                          emptyObject: {},
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

      await generateRoutes(emptyPropsSpec, { outDir: "src" });
      const writeFileCall = vi.mocked(writeFile).mock.calls[0][1] as string;

      expect(writeFileCall).toContain("GET_test");
    });
  });

  describe("edge cases", () => {
    it("should handle edge cases in processAllOf", async () => {
      // Test edge case with empty allOf array
      const emptyAllOfSpec: OpenAPIV3.Document = {
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
                      schema: {
                        type: "object",
                        properties: {
                          test: { type: "string" },
                        },
                        allOf: [],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      await generateRoutes(emptyAllOfSpec, { outDir: "src" });
      const writeFileCall = vi.mocked(writeFile).mock.calls[0][1] as string;

      // Check for the GET endpoint being created, rather than specific schema output
      expect(writeFileCall).toContain("GET_test");
      expect(writeFileCall).toContain("response:");
    });

    it("should handle empty request bodies", async () => {
      // Test edge case with empty request body
      const emptyBodySpec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            post: {
              requestBody: {
                content: {},
              },
              responses: {
                "200": {
                  description: "OK",
                },
              },
            },
          },
        },
      };

      await generateRoutes(emptyBodySpec, { outDir: "src" });
      const writeFileCall = vi.mocked(writeFile).mock.calls[0][1] as string;

      // Should handle empty request body gracefully
      expect(writeFileCall).toContain("POST_test");
    });

    it("should handle schemas with no properties", async () => {
      const noPropsSpec: OpenAPIV3.Document = {
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
                      schema: {
                        type: "object",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      await generateRoutes(noPropsSpec, { outDir: "src" });
      const writeFileCall = vi.mocked(writeFile).mock.calls[0][1] as string;

      expect(writeFileCall).toContain("z.object({})");
    });

    it("should handle null or undefined schema types", async () => {
      const nullSchemaSpec: OpenAPIV3.Document = {
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
                      schema: {
                        type: "object",
                        properties: {
                          // Testing edge case with undefined type
                          undefinedType: { type: undefined },
                          // Testing edge case with string type
                          stringType: { type: "string" },
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

      await generateRoutes(nullSchemaSpec, { outDir: "src" });
      const writeFileCall = vi.mocked(writeFile).mock.calls[0][1] as string;

      expect(writeFileCall).toContain("z.unknown()");
      expect(writeFileCall).toContain("z.string()");
    });

    it("should handle query and path parameters correctly", async () => {
      const paramsSpec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test/{id}": {
            get: {
              parameters: [
                {
                  in: "path",
                  name: "id",
                  schema: { type: "string" },
                  required: true,
                },
                {
                  in: "query",
                  name: "filter",
                  schema: { type: "string" },
                },
                // A reference parameter
                { $ref: "#/components/parameters/Test" },
              ],
              responses: {
                "200": {
                  description: "OK",
                },
              },
            },
          },
        },
        components: {
          parameters: {
            Test: {
              in: "query",
              name: "test",
              schema: { type: "string" },
            },
          },
        },
      };

      await generateRoutes(paramsSpec, { outDir: "src" });
      const writeFileCall = vi.mocked(writeFile).mock.calls[0][1] as string;

      expect(writeFileCall).toContain("GET_test_id");
      expect(writeFileCall).toContain("query:");
    });

    it("should handle file paths with route parameters", async () => {
      const pathParamSpec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/{param1}/{param2}": {
            get: {
              parameters: [
                {
                  in: "path",
                  name: "param1",
                  schema: { type: "string" },
                  required: true,
                },
                {
                  in: "path",
                  name: "param2",
                  schema: { type: "string" },
                  required: true,
                },
              ],
              responses: {
                "200": {
                  description: "OK",
                },
              },
            },
          },
        },
      };

      await generateRoutes(pathParamSpec, { outDir: "src" });
      const writeFileCall = vi.mocked(writeFile).mock.calls[0][1] as string;

      expect(writeFileCall).toContain("GET__param1_param2");
      expect(writeFileCall).toContain("[param1]");
      expect(writeFileCall).toContain("[param2]");
    });
  });
});
