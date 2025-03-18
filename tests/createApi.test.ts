import { createApi } from "@danstackme/apity";
import { QueryClient } from "@tanstack/react-query";
import axios from "axios";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createApiEndpoint } from "../src/createApi";
import { ApiEndpoints } from "../src/types";

describe("createApi", () => {
  const baseUrl = "https://api.example.com";
  const headers = { "X-API-Key": "test-key" };

  const userEndpoint = createApiEndpoint({
    method: "GET",
    response: z.object({
      id: z.number(),
      name: z.string(),
    }),
    query: z.object({
      include: z.string().optional(),
    }),
  });

  const createUserEndpoint = createApiEndpoint({
    method: "POST",
    response: z.object({
      id: z.number(),
      name: z.string(),
    }),
    body: z.object({
      name: z.string(),
    }),
  });

  const apiTree: ApiEndpoints = {
    "/users": [userEndpoint, createUserEndpoint],
  };

  it("should create an API context with default axios client", () => {
    const api = createApi({
      baseUrl,
      headers,
      endpoints: apiTree,
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
      endpoints: apiTree,
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
      endpoints: apiTree,
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
      response: z.object({ data: z.string() }),
      query: z.object({ filter: z.string() }),
    });

    expect(endpoint.method).toBe("GET");
    expect(endpoint.response).toBeDefined();
    expect(endpoint.query).toBeDefined();
    expect(endpoint.body).toBeUndefined();
  });

  it("should create a POST endpoint with body", () => {
    const endpoint = createApiEndpoint({
      method: "POST",
      response: z.object({ id: z.number() }),
      body: z.object({ name: z.string() }),
    });

    expect(endpoint.method).toBe("POST");
    expect(endpoint.response).toBeDefined();
    expect(endpoint.body).toBeDefined();
    expect(endpoint.query).toBeUndefined();
  });

  it("should create an endpoint without schemas", () => {
    const endpoint = createApiEndpoint({
      method: "DELETE",
    });

    expect(endpoint.method).toBe("DELETE");
    expect(endpoint.response).toBeUndefined();
    expect(endpoint.body).toBeUndefined();
    expect(endpoint.query).toBeUndefined();
  });
});
