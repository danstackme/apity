import { QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { AxiosInstance } from "axios";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiProvider } from "../src/context";
import { useFetch, useMutate } from "../src/hooks";
import { z } from "zod";
import { createApiEndpoint } from "../src/createApi";

// Define API endpoints for tests
const userSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const usersEndpoint = createApiEndpoint({
  method: "GET",
  response: z.object({
    users: z.array(userSchema),
  }),
});

const createUserEndpoint = createApiEndpoint({
  method: "POST",
  response: userSchema,
  body: z.object({
    name: z.string(),
  }),
});

const getUserEndpoint = createApiEndpoint({
  method: "GET",
  response: userSchema,
});

const updateUserEndpoint = createApiEndpoint({
  method: "PUT",
  response: userSchema,
  body: z.object({
    name: z.string(),
  }),
});

const getUserPostsEndpoint = createApiEndpoint({
  method: "GET",
  response: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
    })
  ),
});

const getUserPostWithIdEndpoint = createApiEndpoint({
  method: "GET",
  response: z.object({
    id: z.string(),
    title: z.string(),
  }),
});

const apiEndpoints = {
  "/users": [usersEndpoint, createUserEndpoint],
  "/users/[id]": [getUserEndpoint, updateUserEndpoint],
  "/users/[userId]/posts": [getUserPostsEndpoint],
  "/users/[userId]/posts/[postId]": [getUserPostWithIdEndpoint],
};

declare module "../src/types" {
  interface Register {
    apiTree: typeof apiEndpoints;
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
      api={{
        client: axiosInstance,
        queryClient: queryClient,
        config: { baseUrl: "http://api.example.com", endpoints: apiEndpoints },
      }}
    >
      {children}
    </ApiProvider>
  );

  it("should fetch and display data", async () => {
    const mockData = { users: [{ id: "1", name: "Test" }] };
    (axiosInstance.get as any).mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(() => useFetch("/users"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(axiosInstance.get).toHaveBeenCalledWith("/users", {
      baseURL: "http://api.example.com",
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
          method: "post",
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
          method: "post",
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
            // @ts-expect-error - This is a test for missing params
            params: {},
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
          method: "put",
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

  it("should handle multiple path parameters in fetch requests", async () => {
    const mockData = [{ id: "1", title: "Post 1" }];
    (axiosInstance.get as any).mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(
      () =>
        useFetch("/users/[userId]/posts", {
          params: { userId: "123" },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(axiosInstance.get).toHaveBeenCalledWith("/users/123/posts", {
      baseURL: "http://api.example.com",
    });
    expect(result.current.data).toEqual(mockData);
  });

  it("should handle missing path parameter object", () => {
    expect(() =>
      renderHook(() => useFetch("/users/[id]"), { wrapper })
    ).toThrow("Missing path parameter: id");
  });

  it("should handle path with no parameters", () => {
    const { result } = renderHook(() => useFetch("/users"), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });

  it("should handle path with multiple parameters", async () => {
    const mockData = { id: "1", title: "Test Post" };
    (axiosInstance.get as any).mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(
      () =>
        useFetch("/users/[userId]/posts/[postId]", {
          params: { userId: "123", postId: "456" },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(axiosInstance.get).toHaveBeenCalledWith("/users/123/posts/456", {
      baseURL: "http://api.example.com",
    });
  });

  it("should handle missing one of multiple parameters", () => {
    expect(() =>
      renderHook(
        () =>
          useFetch("/users/[userId]/posts/[postId]", {
            params: { userId: "123" },
          }),
        { wrapper }
      )
    ).toThrow("Missing path parameter: postId");
  });

  it("should handle path with invalid parameter format", () => {
    const { result } = renderHook(
      () =>
        useFetch("/users", {
          params: { id: "123" },
        }),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(true);
  });
});
