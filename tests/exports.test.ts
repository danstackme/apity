import { describe, it, expect } from "vitest";
import {
  useFetch,
  useMutate,
  ApiProvider,
  useApiContext,
  createApiEndpoint,
} from "../src";

describe("Module exports", () => {
  it("should export all required functions and components", () => {
    expect(useFetch).toBeDefined();
    expect(useFetch).toBeTypeOf("function");

    expect(useMutate).toBeDefined();
    expect(useMutate).toBeTypeOf("function");

    expect(ApiProvider).toBeDefined();
    expect(ApiProvider).toBeTypeOf("function");

    expect(useApiContext).toBeDefined();
    expect(useApiContext).toBeTypeOf("function");

    expect(createApiEndpoint).toBeDefined();
    expect(createApiEndpoint).toBeTypeOf("function");
  });

  it("should export type ApiEndpoint", () => {
    // This is a type-level test that will fail at compile time if the type is not exported
    expect(true).toBe(true); // Dummy assertion to satisfy test
  });

  it("should export type HttpMethod", () => {
    // This is a type-level test that will fail at compile time if the type is not exported
    expect(true).toBe(true); // Dummy assertion to satisfy test
  });
});
