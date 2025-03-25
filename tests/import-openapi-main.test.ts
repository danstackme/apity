import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// Set test environment
process.env.NODE_ENV = "test";

// Store original process.exit
const originalExit = process.exit;

// Mock fs/promises - properly handle the default export
const mockReadFile = vi.fn().mockResolvedValue("");
const mockWriteFile = vi.fn().mockResolvedValue(undefined);
const mockMkdir = vi.fn().mockResolvedValue(undefined);

vi.mock("fs/promises", () => {
  const mocks = {
    mkdir: mockMkdir,
    writeFile: mockWriteFile,
    readFile: mockReadFile,
    default: {
      mkdir: mockMkdir,
      writeFile: mockWriteFile,
      readFile: mockReadFile,
    },
  };
  return mocks;
});

// Mock commander
const mockProgram = {
  name: vi.fn().mockReturnThis(),
  description: vi.fn().mockReturnThis(),
  argument: vi.fn().mockReturnThis(),
  option: vi.fn().mockReturnThis(),
  parse: vi.fn(),
  opts: vi.fn().mockReturnValue({ outDir: "dist" }),
  args: ["test.yaml"],
};

vi.mock("commander", () => ({
  Command: vi.fn().mockImplementation(() => mockProgram),
}));

// We don't need to mock yaml since we now use our own parseYaml function

// Mock swagger2openapi
vi.mock("swagger2openapi", () => ({
  default: {
    convert: vi.fn().mockImplementation((doc) => {
      return { openapi: { ...doc, openapi: "3.0.0" } };
    }),
  },
}));

describe("import-openapi main function", () => {
  // Setup mocks for each test
  beforeEach(() => {
    // Reset modules to get a fresh import in each test
    vi.resetModules();

    // Reset mocks
    mockReadFile.mockReset();
    mockWriteFile.mockReset();
    mockMkdir.mockReset();
    vi.mocked(mockProgram.parse).mockReset();
    vi.mocked(mockProgram.opts).mockReset().mockReturnValue({ outDir: "dist" });
    mockProgram.args = ["test.yaml"];

    // Mock process.exit
    process.exit = vi.fn() as any;
  });

  afterAll(() => {
    // Restore process.exit
    process.exit = originalExit;
  });

  async function runMainFunction() {
    // Save original NODE_ENV
    const originalEnv = process.env.NODE_ENV;

    // Set NODE_ENV to development to allow main to run
    process.env.NODE_ENV = "development";

    // Execute the whole module which will trigger main() if NODE_ENV != 'test'
    await import("../scripts/import-openapi");

    // Restore NODE_ENV
    process.env.NODE_ENV = originalEnv;
  }

  it("should process JSON files correctly", async () => {
    // Set up readFile mock to return JSON
    mockReadFile.mockResolvedValueOnce(
      JSON.stringify({
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            get: {
              responses: {
                "200": {
                  description: "OK",
                },
              },
            },
          },
        },
      })
    );

    // Run the module which will execute main()
    await runMainFunction();

    // Verify the expected functions were called
    expect(mockProgram.parse).toHaveBeenCalled();
    expect(mockReadFile).toHaveBeenCalledWith("test.yaml", "utf-8");
    expect(mockWriteFile).toHaveBeenCalled();
  });

  it("should process YAML files correctly", async () => {
    // Set up readFile mock to return YAML
    mockReadFile.mockResolvedValueOnce(
      "openapi: 3.0.0\ninfo:\n  title: Test API\n  version: 1.0.0\npaths:\n  /test:\n    get:\n      responses:\n        '200':\n          description: OK"
    );

    // Set args to a YAML file
    mockProgram.args = ["test.yml"];

    // Run the module which will execute main()
    await runMainFunction();

    // Verify YAML was processed
    expect(mockReadFile).toHaveBeenCalledWith("test.yml", "utf-8");
    expect(mockWriteFile).toHaveBeenCalled();
  });

  it("should process complex YAML files with arrays and nested objects", async () => {
    // Set up readFile mock to return YAML with arrays and nested objects
    mockReadFile.mockResolvedValueOnce(`
openapi: 3.0.0
info:
  title: Complex API
  version: 1.0.0
servers:
  - url: https://api.example.com
    description: Production server
  - url: https://staging-api.example.com
    description: Staging server
paths:
  /users:
    get:
      summary: Get all users
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            default: 10
        - name: offset
          in: query
          schema:
            type: integer
            default: 0
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id:
                      type: integer
                    name:
                      type: string
  /users/{id}:
    get:
      summary: Get user by ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: OK
    `);

    // Set args to a YAML file
    mockProgram.args = ["complex.yml"];

    // Run the module which will execute main()
    await runMainFunction();

    // Verify YAML was processed
    expect(mockReadFile).toHaveBeenCalledWith("complex.yml", "utf-8");
    expect(mockWriteFile).toHaveBeenCalled();
  });

  it("should process YAML with edge cases including booleans, numbers and empty arrays", async () => {
    // Set up readFile mock to return YAML with boolean, number values and multiple indentation patterns
    mockReadFile.mockResolvedValueOnce(`
openapi: 3.0.0
info:
  title: Edge Case API
  version: 1.0.0
# This is a comment that should be ignored
flags:
  isEnabled: true
  isDisabled: false
constants:
  pi: 3.14159
  count: 42
  emptyValue: 
  quotedString: "hello world"
  singleQuoted: 'single quotes'
arrays:
  emptyArray:
    - 
  mixedTypes:
    - 10
    - "string"
    - true
    - 
      nestedObj:
        prop: value
  nestedArray:
    - 
      - first level
      - second item
    - 
      - another list
empty_sections:
paths:
  /test:
    get:
      responses:
        '200':
          description: OK
    `);

    // Set args to a YAML file
    mockProgram.args = ["edge-case.yml"];

    // Run the module which will execute main()
    await runMainFunction();

    // Verify YAML was processed
    expect(mockReadFile).toHaveBeenCalledWith("edge-case.yml", "utf-8");
    expect(mockWriteFile).toHaveBeenCalled();
  });

  it("should handle errors correctly", async () => {
    // Mock console.error
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Set up readFile to throw an error
    mockReadFile.mockRejectedValueOnce(new Error("File not found"));

    // Run the module which will execute main()
    await runMainFunction();

    // Verify error handling
    expect(consoleSpy).toHaveBeenCalledWith("Error:", expect.any(Error));
    expect(process.exit).toHaveBeenCalledWith(1);

    // Restore mocks
    consoleSpy.mockRestore();
  });
});
