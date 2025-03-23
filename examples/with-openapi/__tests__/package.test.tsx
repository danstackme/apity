import {
  ApiProvider,
  useFetch,
  useMutate,
  createApi,
  createApiEndpoint,
} from "@danstackme/apity";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import axios, { AxiosStatic } from "axios";
import React from "react";
import { z } from "zod";

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

const api = createApi({
  baseUrl: "http://api.example.com",
  fetchEndpoints: fetchEndpoints,
  mutateEndpoints: mutateEndpoints,
});

declare module "@danstackme/apity" {
  interface Register {
    fetchEndpoints: typeof fetchEndpoints;
    mutateEndpoints: typeof mutateEndpoints;
  }
}

// Mock axios
vi.mock("axios", () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    request: vi.fn(),
    defaults: {
      headers: {},
      baseURL: "",
    },
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() },
    },
  };

  return {
    default: {
      ...mockAxiosInstance,
      create: vi.fn(() => mockAxiosInstance),
      Cancel: vi.fn(),
      CancelToken: vi.fn(),
      isCancel: vi.fn(),
      VERSION: "1.0.0",
      isAxiosError: vi.fn(),
      spread: vi.fn(),
      toFormData: vi.fn(),
      formToJSON: vi.fn(),
      getAdapter: vi.fn(),
      mergeConfig: vi.fn(),
    },
  };
});

describe("Package Integration Test", () => {
  let mockAxios: AxiosStatic;

  beforeEach(() => {
    mockAxios = axios;

    vi.clearAllMocks();
  });

  it("should compile without type errors", () => {
    // This test will fail at compile time if there are type errors
    expect(true).toBe(true);
  });

  it("should allow using the hooks", async () => {
    const mockData = { users: [{ id: "1", name: "Test" }] };
    (mockAxios.get as any).mockResolvedValueOnce({ data: mockData });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ApiProvider api={api}>{children}</ApiProvider>
    );

    // Test useFetch
    const { result } = renderHook(
      () =>
        useFetch({
          path: "/users",
          query: { filter: "active" },
        }),
      { wrapper }
    );

    // Wait for the query to complete
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockAxios.get).toHaveBeenCalledWith("/users", {
      baseURL: "http://api.example.com",
      params: { filter: "active" },
    });
    expect(result.current.data).toEqual(mockData);

    // Test useMutate
    const mockResponse = { id: "1", name: "Created User" };
    (mockAxios.request as any).mockResolvedValueOnce({ data: mockResponse });

    const { result: mutateResult } = renderHook(
      () =>
        useMutate({
          path: "/users",
          method: "POST",
          body: {
            name: "New User",
          },
        }),
      { wrapper }
    );

    const variables = { name: "New User" };
    mutateResult.current.mutate(variables);

    // Wait for the mutation to complete
    await waitFor(() => {
      expect(mutateResult.current.isSuccess).toBe(true);
    });

    expect(mockAxios.request).toHaveBeenCalledWith({
      method: "POST",
      url: "/users",
      baseURL: "http://api.example.com",
      data: variables,
    });
    expect(mutateResult.current.data).toEqual(mockResponse);
  });
});
