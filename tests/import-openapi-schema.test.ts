import { writeFile } from "fs/promises";
import { OpenAPIV3 } from "openapi-types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  convertToOpenAPI3,
  generateRoutes,
  isReferenceObject,
  processSchemaDefinitions,
  getRefName,
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
});
