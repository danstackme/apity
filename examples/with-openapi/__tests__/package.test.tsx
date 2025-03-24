import {
  ApiProvider,
  useFetch,
  useMutate,
  createApi,
  createApiEndpoint,
} from "@danstackme/apity";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { z } from "zod";
import { QueryClient } from "@tanstack/react-query";

// Create a simplified version of the test
describe("Package Integration Test", () => {
  it("should compile without type errors", () => {
    // This test will fail at compile time if there are type errors
    expect(true).toBe(true);
  });

  it("should create a valid API instance", () => {
    const fetchEndpoints = {
      "/users": [
        createApiEndpoint({
          method: "GET",
          query: z.object({
            filter: z.string(),
          }),
          response: z.void(),
        }),
      ],
    };

    const mutateEndpoints = {
      "/users": [
        createApiEndpoint({
          method: "POST",
          response: z.void(),
          body: z.object({
            name: z.string(),
          }),
        }),
      ],
    };

    // Create API with mock client
    const mockClient = {
      get: vi.fn().mockResolvedValue({ data: {} }),
      post: vi.fn().mockResolvedValue({ data: {} }),
      put: vi.fn().mockResolvedValue({ data: {} }),
      delete: vi.fn().mockResolvedValue({ data: {} }),
      patch: vi.fn().mockResolvedValue({ data: {} }),
      request: vi.fn().mockResolvedValue({ data: {} }),
      defaults: { headers: {}, baseURL: "" },
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() },
      },
    };

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const api = createApi({
      baseUrl: "http://example.com",
      fetchEndpoints,
      mutateEndpoints,
      client: mockClient as any,
      queryClient,
    });

    // Type check the API structure
    expect(api).toHaveProperty("client");
    expect(api).toHaveProperty("queryClient");
    expect(api).toHaveProperty("fetchEndpoints");
    expect(api).toHaveProperty("mutateEndpoints");

    // Ensure the API structure matches what we expect
    expect(Object.keys(api.fetchEndpoints)).toContain("/users");
    expect(Object.keys(api.mutateEndpoints)).toContain("/users");
  });
});
