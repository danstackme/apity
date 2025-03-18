import { QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { AxiosInstance } from "axios";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiProvider } from "../src/context";
import { useFetch, useMutate } from "../src/hooks";
import type { ApiEndpoint, ApiRouteDefinition } from "../src/types";

// Define API endpoints for tests
interface TestApiTree extends ApiRouteDefinition {
  "/users": {
    GET: ApiEndpoint<{ users: Array<{ id: string; name: string }> }>;
    POST: ApiEndpoint<{ id: string; name: string }, { name: string }>;
  };
  "/users/[id]": {
    GET: ApiEndpoint<{ id: string; name: string }, void, void, { id: string }>;
    PUT: ApiEndpoint<
      { id: string; name: string },
      { name: string },
      void,
      { id: string }
    >;
  };
  "/users/[userId]/posts": {
    GET: ApiEndpoint<
      Array<{ id: string; title: string }>,
      void,
      void,
      { userId: string }
    >;
  };
}

// Augment the Register interface
declare module "../src/types" {
  interface Register {
    apiTree: TestApiTree & ApiRouteDefinition;
  }
}

describe("API Hooks Integration", () => {
  let queryClient: QueryClient;
  let axiosInstance: AxiosInstance;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Create a mock axios instance
    axiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
      request: vi.fn(),
      defaults: {},
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() },
      },
      getUri: vi.fn(),
      head: vi.fn(),
      options: vi.fn(),
      create: vi.fn(),
      isAxiosError: vi.fn(),
      isCancel: vi.fn(),
      all: vi.fn(),
      spread: vi.fn(),
    } as unknown as AxiosInstance;

    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ApiProvider
      baseURL="http://api.example.com"
      client={axiosInstance}
      queryClient={queryClient}
    >
      {children}
    </ApiProvider>
  );

  it("should fetch and display data", async () => {
    const mockData = { users: [{ id: "1", name: "Test" }] };
    (axiosInstance.get as any).mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(
      () =>
        useFetch("/users", {
          query: { filter: "active" },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(axiosInstance.get).toHaveBeenCalledWith("/users", {
      baseURL: "http://api.example.com",
      params: { filter: "active" },
    });
    expect(result.current.data).toEqual(mockData);
  });

  it("should handle fetch errors", async () => {
    const error = new Error("Network error");
    (axiosInstance.get as any).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useFetch("/users"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
  });

  it("should handle mutations", async () => {
    const mockResponse = { id: "1", name: "Created User" };
    (axiosInstance.request as any).mockResolvedValueOnce({
      data: mockResponse,
    });

    const onSuccess = vi.fn();
    const onError = vi.fn();

    const { result } = renderHook(
      () =>
        useMutate("/users", {
          method: "POST",
          onSuccess,
          onError,
        }),
      { wrapper }
    );

    const variables = { name: "New User" };
    result.current.mutate(variables);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(axiosInstance.request).toHaveBeenCalledWith({
      method: "post",
      url: "/users",
      baseURL: "http://api.example.com",
      data: variables,
    });
    expect(onSuccess).toHaveBeenCalledWith(mockResponse, variables, undefined);
    expect(onError).not.toHaveBeenCalled();
  });

  it("should handle mutation errors", async () => {
    const error = new Error("Network error");
    (axiosInstance.request as any).mockRejectedValueOnce(error);

    const onSuccess = vi.fn();
    const onError = vi.fn();

    const { result } = renderHook(
      () =>
        useMutate("/users", {
          method: "POST",
          onSuccess,
          onError,
        }),
      { wrapper }
    );

    const variables = { name: "New User" };
    result.current.mutate(variables);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(error, variables, undefined);
  });

  it("should throw error when path parameter is missing", () => {
    expect(() =>
      renderHook(
        () =>
          useFetch("/users/[id]", {
            //@ts-expect-error - Testing error case with missing required param
            params: {}, // Missing 'id' parameter
          }),
        { wrapper }
      )
    ).toThrow("Missing path parameter: id");
  });

  it("should handle path parameters in mutation requests", async () => {
    const mockData = { id: "123", name: "Updated" };
    (axiosInstance.request as any).mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(
      () =>
        useMutate("/users/[id]", {
          method: "PUT",
          params: { id: "123" },
        }),
      { wrapper }
    );

    await result.current.mutateAsync({ name: "Updated" });

    expect(axiosInstance.request).toHaveBeenCalledWith({
      method: "put",
      url: "/users/123",
      baseURL: "http://api.example.com",
      data: { name: "Updated" },
    });
  });
});
