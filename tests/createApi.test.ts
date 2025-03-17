import { describe, it, expect, beforeEach } from "vitest";
import { createApi, createApiEndpoint } from "../src/createApi";
import { QueryClient } from "@tanstack/react-query";
import axios from "axios";
import { z } from "zod";
import type { ApiRouteDefinition } from "../src/types";

describe("createApi", () => {
  const baseUrl = "https://api.example.com";
  const headers = { "X-API-Key": "test-key" };

  type TestApiTree = ApiRouteDefinition & {
    users: {
      get: typeof userEndpoint;
      post: typeof createUserEndpoint;
    };
  };

  const userEndpoint = createApiEndpoint({
    method: "GET",
    responseSchema: z.object({
      id: z.number(),
      name: z.string(),
    }),
    querySchema: z.object({
      include: z.string().optional(),
    }),
  });

  const createUserEndpoint = createApiEndpoint({
    method: "POST",
    responseSchema: z.object({
      id: z.number(),
      name: z.string(),
    }),
    bodySchema: z.object({
      name: z.string(),
    }),
  });

  const apiTree: TestApiTree = {
    users: {
      get: userEndpoint,
      post: createUserEndpoint,
    },
  };

  it("should create an API context with default axios client", () => {
    const api = createApi({
      baseUrl,
      headers,
      apiTree,
    });

    expect(api.client).toBeDefined();
    expect(api.client.defaults.baseURL).toBe(baseUrl);
    expect(api.client.defaults.headers).toEqual(
      expect.objectContaining(headers)
    );
    expect(api.queryClient).toBeInstanceOf(QueryClient);
    expect(api.config).toEqual({
      baseUrl,
      headers,
      apiTree,
    });
    expect(api.middlewares).toEqual([]);
    expect(api.apiTree).toBe(apiTree);
  });

  it("should use provided axios client and query client", () => {
    const customAxios = axios.create();
    const customQueryClient = new QueryClient();

    const api = createApi({
      baseUrl,
      headers,
      apiTree,
      client: customAxios,
      queryClient: customQueryClient,
    });

    expect(api.client).toBe(customAxios);
    expect(api.queryClient).toBe(customQueryClient);
  });
});

describe("createApiEndpoint", () => {
  it("should create a GET endpoint with query params", () => {
    const endpoint = createApiEndpoint({
      method: "GET",
      responseSchema: z.object({ data: z.string() }),
      querySchema: z.object({ filter: z.string() }),
    });

    expect(endpoint.method).toBe("GET");
    expect(endpoint.responseSchema).toBeDefined();
    expect(endpoint.querySchema).toBeDefined();
    expect(endpoint.bodySchema).toBeUndefined();
  });

  it("should create a POST endpoint with body", () => {
    const endpoint = createApiEndpoint({
      method: "POST",
      responseSchema: z.object({ id: z.number() }),
      bodySchema: z.object({ name: z.string() }),
    });

    expect(endpoint.method).toBe("POST");
    expect(endpoint.responseSchema).toBeDefined();
    expect(endpoint.bodySchema).toBeDefined();
    expect(endpoint.querySchema).toBeUndefined();
  });

  it("should create an endpoint without schemas", () => {
    const endpoint = createApiEndpoint({
      method: "DELETE",
    });

    expect(endpoint.method).toBe("DELETE");
    expect(endpoint.responseSchema).toBeUndefined();
    expect(endpoint.bodySchema).toBeUndefined();
    expect(endpoint.querySchema).toBeUndefined();
  });
});
