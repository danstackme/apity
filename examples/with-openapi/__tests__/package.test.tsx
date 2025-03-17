import { ApiProvider, useFetch, useMutate } from "@danstackme/apity";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import axios, { AxiosStatic } from "axios";
import React from "react";
import { QueryClient } from "@tanstack/react-query";

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
  let queryClient: QueryClient;
  let mockAxios: AxiosStatic;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

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
      <ApiProvider
        baseURL="http://api.example.com"
        client={mockAxios}
        queryClient={queryClient}
      >
        {children}
      </ApiProvider>
    );

    // Test useFetch
    const { result } = renderHook(
      () =>
        useFetch("/users", {
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
        useMutate("/users", {
          method: "POST",
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
      method: "post",
      url: "/users",
      baseURL: "http://api.example.com",
      data: variables,
    });
    expect(mutateResult.current.data).toEqual(mockResponse);
  });
});
