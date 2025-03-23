import { createApi } from "../src/createApi";
import { QueryClient } from "@tanstack/react-query";
import axios from "axios";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createApiEndpoint } from "../src/createApi";
import { ApiEndpoints } from "../src/types";
import { vi } from "vitest";

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

  const fetchEndpoints: ApiEndpoints = {
    "/users": [userEndpoint],
  };

  const mutateEndpoints: ApiEndpoints = {
    "/users": [createUserEndpoint],
  };

  it("should create an API context with default axios client", () => {
    const api = createApi({
      baseUrl,
      headers,
      fetchEndpoints,
      mutateEndpoints,
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
      fetchEndpoints,
      mutateEndpoints,
    });
    expect(api.middleware).toEqual([]);
    expect(api.fetchEndpoints).toBe(fetchEndpoints);
    expect(api.mutateEndpoints).toBe(mutateEndpoints);
  });

  it("should use provided axios client and query client", () => {
    const customAxios = axios.create();
    const customQueryClient = new QueryClient();

    const api = createApi({
      baseUrl,
      headers,
      fetchEndpoints,
      mutateEndpoints,
      client: customAxios,
      queryClient: customQueryClient,
    });

    expect(api.client).toBe(customAxios);
    expect(api.queryClient).toBe(customQueryClient);
  });

  it("should handle middleware configuration", () => {
    const beforeMiddleware = (config: any) => config;
    const afterMiddleware = (response: any) => response;
    const errorMiddleware = (error: any) => Promise.reject(error);

    const api = createApi({
      baseUrl: "https://api.example.com",
      fetchEndpoints: {},
      mutateEndpoints: {},
      middleware: {
        before: beforeMiddleware,
        after: afterMiddleware,
        onError: errorMiddleware,
      },
    });

    expect(api.middleware).toHaveLength(3);
    expect(api.middleware).toContain(beforeMiddleware);
    expect(api.middleware).toContain(afterMiddleware);
    expect(api.middleware).toContain(errorMiddleware);
  });

  it("should configure provided client with baseUrl and headers", () => {
    const customClient = axios.create();
    const customHeaders = { "X-Custom-Header": "value" };

    createApi({
      baseUrl: "https://api.example.com",
      fetchEndpoints: {},
      mutateEndpoints: {},
      client: customClient,
      headers: customHeaders,
    });

    expect(customClient.defaults.baseURL).toBe("https://api.example.com");
    expect(customClient.defaults.headers).toMatchObject(customHeaders);
  });

  it("should create new client with config when no client provided", () => {
    const customHeaders = { "X-Custom-Header": "value" };
    const api = createApi({
      baseUrl: "https://api.example.com",
      fetchEndpoints: {},
      mutateEndpoints: {},
      headers: customHeaders,
    });

    expect(api.client.defaults.baseURL).toBe("https://api.example.com");
    expect(api.client.defaults.headers).toMatchObject(customHeaders);
  });

  it("should handle partial middleware configuration", () => {
    const beforeMiddleware = (config: any) => config;

    const api = createApi({
      baseUrl: "https://api.example.com",
      fetchEndpoints: {},
      mutateEndpoints: {},
      middleware: {
        before: beforeMiddleware,
      },
    });

    expect(api.middleware).toHaveLength(1);
    expect(api.middleware).toContain(beforeMiddleware);
  });

  it("should handle error middleware separately", () => {
    const errorMiddleware = (error: any) => Promise.reject(error);

    const api = createApi({
      baseUrl: "https://api.example.com",
      fetchEndpoints: {},
      mutateEndpoints: {},
      middleware: {
        onError: errorMiddleware,
      },
    });

    expect(api.middleware).toHaveLength(1);
    expect(api.middleware).toContain(errorMiddleware);
  });

  it("should handle response middleware separately", () => {
    const afterMiddleware = (response: any) => response;

    const api = createApi({
      baseUrl: "https://api.example.com",
      fetchEndpoints: {},
      mutateEndpoints: {},
      middleware: {
        after: afterMiddleware,
      },
    });

    expect(api.middleware).toHaveLength(1);
    expect(api.middleware).toContain(afterMiddleware);
  });

  it("should create API with no middleware", () => {
    const api = createApi({
      baseUrl: "https://api.example.com",
      fetchEndpoints: {},
      mutateEndpoints: {},
    });

    expect(api.middleware).toHaveLength(0);
  });

  it("should handle headers with existing client headers", () => {
    const existingHeaders = { "Existing-Header": "value" };
    const newHeaders = { "X-Custom-Header": "value" };
    const customClient = axios.create({
      headers: existingHeaders,
    });

    const api = createApi({
      baseUrl: "https://api.example.com",
      fetchEndpoints: {},
      mutateEndpoints: {},
      client: customClient,
      headers: newHeaders,
    });

    expect(api.client.defaults.headers).toMatchObject({
      ...existingHeaders,
      ...newHeaders,
    });
  });

  it("should properly configure interceptors", () => {
    const beforeMiddleware = vi.fn((config) => config);
    const afterMiddleware = vi.fn((response) => response);
    const errorMiddleware = vi.fn((error) => Promise.reject(error));

    const customClient = axios.create();
    vi.spyOn(customClient.interceptors.request, "use");
    vi.spyOn(customClient.interceptors.response, "use");

    createApi({
      baseUrl: "https://api.example.com",
      fetchEndpoints: {},
      mutateEndpoints: {},
      client: customClient,
      middleware: {
        before: beforeMiddleware,
        after: afterMiddleware,
        onError: errorMiddleware,
      },
    });

    expect(customClient.interceptors.request.use).toHaveBeenCalledWith(
      beforeMiddleware
    );
    expect(customClient.interceptors.response.use).toHaveBeenCalledWith(
      afterMiddleware
    );
    expect(customClient.interceptors.response.use).toHaveBeenCalledWith(
      undefined,
      errorMiddleware
    );
  });

  it("should create new axios instance with correct defaults", () => {
    const baseUrl = "https://api.example.com";
    const headers = { "X-Custom-Header": "value" };

    const api = createApi({
      baseUrl,
      fetchEndpoints: {},
      mutateEndpoints: {},
      headers,
    });

    expect(api.client.defaults.baseURL).toBe(baseUrl);
    expect(api.client.defaults.headers).toMatchObject(headers);
  });

  it("should update existing client with new baseURL", () => {
    const oldBaseUrl = "https://old.example.com";
    const newBaseUrl = "https://new.example.com";
    const customClient = axios.create({ baseURL: oldBaseUrl });

    createApi({
      baseUrl: newBaseUrl,
      fetchEndpoints: {},
      mutateEndpoints: {},
      client: customClient,
    });

    expect(customClient.defaults.baseURL).toBe(newBaseUrl);
  });

  it("should create API with default QueryClient when not provided", () => {
    const api = createApi({
      baseUrl: "https://api.example.com",
      fetchEndpoints: {},
      mutateEndpoints: {},
    });

    expect(api.queryClient).toBeInstanceOf(QueryClient);
  });

  it("should preserve existing headers when updating client config", () => {
    const existingHeaders = { Authorization: "Bearer token" };
    const newHeaders = { "X-Custom-Header": "value" };
    const customClient = axios.create({
      headers: existingHeaders,
    });

    const api = createApi({
      baseUrl: "https://api.example.com",
      fetchEndpoints: {},
      mutateEndpoints: {},
      client: customClient,
      headers: newHeaders,
    });

    expect(api.client.defaults.headers).toMatchObject({
      ...existingHeaders,
      ...newHeaders,
    });
  });

  it("should handle client creation with no headers", () => {
    const api = createApi({
      baseUrl: "https://api.example.com",
      fetchEndpoints: {},
      mutateEndpoints: {},
    });

    expect(api.client.defaults.baseURL).toBe("https://api.example.com");
    expect(api.client.defaults.headers).toBeDefined();
  });

  it("should handle client update with no headers", () => {
    const customClient = axios.create();
    const api = createApi({
      baseUrl: "https://api.example.com",
      fetchEndpoints: {},
      mutateEndpoints: {},
      client: customClient,
    });

    expect(api.client.defaults.baseURL).toBe("https://api.example.com");
    expect(api.client.defaults.headers).toBeDefined();
  });

  it("should return correct API tree", () => {
    const api = createApi({
      baseUrl: "https://api.example.com",
      fetchEndpoints,
      mutateEndpoints,
    });

    expect(api.fetchEndpoints).toBe(fetchEndpoints);
    expect(api.mutateEndpoints).toBe(mutateEndpoints);
  });

  it("should properly configure request interceptor", async () => {
    const beforeMiddleware = vi.fn((config) => {
      return {
        ...config,
        headers: { ...config.headers, "X-Modified": "true" },
      };
    });

    const customClient = axios.create();
    const requestSpy = vi.spyOn(customClient.interceptors.request, "use");

    createApi({
      baseUrl: "https://api.example.com",
      fetchEndpoints: {},
      mutateEndpoints: {},
      client: customClient,
      middleware: {
        before: beforeMiddleware,
      },
    });

    expect(requestSpy).toHaveBeenCalledWith(beforeMiddleware);
    expect(beforeMiddleware).toHaveBeenCalledTimes(0);
  });

  it("should properly configure response interceptor", async () => {
    const afterMiddleware = vi.fn((response) => ({
      ...response,
      data: { ...response.data, modified: true },
    }));

    const customClient = axios.create();
    const responseSpy = vi.spyOn(customClient.interceptors.response, "use");

    createApi({
      baseUrl: "https://api.example.com",
      fetchEndpoints: {},
      mutateEndpoints: {},
      client: customClient,
      middleware: {
        after: afterMiddleware,
      },
    });

    expect(responseSpy).toHaveBeenCalledWith(afterMiddleware);
    expect(afterMiddleware).toHaveBeenCalledTimes(0);
  });

  it("should properly configure error interceptor", async () => {
    const errorMiddleware = vi.fn((err) => Promise.reject(err));

    const customClient = axios.create();
    const responseSpy = vi.spyOn(customClient.interceptors.response, "use");

    createApi({
      baseUrl: "https://api.example.com",
      fetchEndpoints: {},
      mutateEndpoints: {},
      client: customClient,
      middleware: {
        onError: errorMiddleware,
      },
    });

    expect(responseSpy).toHaveBeenCalledWith(undefined, errorMiddleware);
    expect(errorMiddleware).toHaveBeenCalledTimes(0);
  });

  it("should configure all interceptors in correct order", () => {
    const beforeMiddleware = vi.fn();
    const afterMiddleware = vi.fn();
    const errorMiddleware = vi.fn();

    const customClient = axios.create();
    const requestSpy = vi.spyOn(customClient.interceptors.request, "use");
    const responseSpy = vi.spyOn(customClient.interceptors.response, "use");

    createApi({
      baseUrl: "https://api.example.com",
      fetchEndpoints: {},
      mutateEndpoints: {},
      client: customClient,
      middleware: {
        before: beforeMiddleware,
        after: afterMiddleware,
        onError: errorMiddleware,
      },
    });

    expect(requestSpy).toHaveBeenCalledWith(beforeMiddleware);
    expect(responseSpy).toHaveBeenCalledWith(afterMiddleware);
    expect(responseSpy).toHaveBeenCalledWith(undefined, errorMiddleware);
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

  it("should create endpoint with all options", () => {
    const responseSchema = z.object({ id: z.string() });
    const bodySchema = z.object({ name: z.string() });
    const querySchema = z.object({ filter: z.string() });

    const endpoint = createApiEndpoint({
      method: "POST",
      response: responseSchema,
      body: bodySchema,
      query: querySchema,
    });

    expect(endpoint.method).toBe("POST");
    expect(endpoint.response).toBe(responseSchema);
    expect(endpoint.body).toBe(bodySchema);
    expect(endpoint.query).toBe(querySchema);
  });

  it("should create endpoint with minimal options", () => {
    const endpoint = createApiEndpoint({
      method: "GET",
    });

    expect(endpoint.method).toBe("GET");
    expect(endpoint.response).toBeUndefined();
    expect(endpoint.body).toBeUndefined();
    expect(endpoint.query).toBeUndefined();
  });
});

describe("createApi middleware configuration", () => {
  it("should handle undefined middleware", () => {
    const api = createApi({
      baseUrl: "https://api.example.com",
      fetchEndpoints: {},
      mutateEndpoints: {},
      middleware: undefined,
    });

    expect(api.middleware).toHaveLength(0);
  });

  it("should handle empty middleware object", () => {
    const api = createApi({
      baseUrl: "https://api.example.com",
      fetchEndpoints: {},
      mutateEndpoints: {},
      middleware: {},
    });

    expect(api.middleware).toHaveLength(0);
  });

  it("should handle all middleware types together", () => {
    const beforeMiddleware = vi.fn((config) => config);
    const afterMiddleware = vi.fn((response) => response);
    const errorMiddleware = vi.fn((error) => Promise.reject(error));

    const customClient = axios.create();

    const api = createApi({
      baseUrl: "https://api.example.com",
      fetchEndpoints: {},
      mutateEndpoints: {},
      client: customClient,
      middleware: {
        before: beforeMiddleware,
        after: afterMiddleware,
        onError: errorMiddleware,
      },
    });

    expect(api.middleware).toContain(beforeMiddleware);
    expect(api.middleware).toContain(afterMiddleware);
    expect(api.middleware).toContain(errorMiddleware);
    expect(api.middleware).toHaveLength(3);
  });
});
