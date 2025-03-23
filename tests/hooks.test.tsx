import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import axios from "axios";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiProvider } from "../src/context";
import { createApi, createApiEndpoint } from "../src/createApi";
import { useFetch, useMutate } from "../src/index";

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

const mutateEndpoints = {
  "/users": [createUserEndpoint],
  "/users/[id]": [updateUserEndpoint],
} as const;

const fetchEndpoints = {
  "/users": [usersEndpoint],
  "/users/[id]": [getUserEndpoint],
  "/users/[userId]/posts": [getUserPostsEndpoint],
  "/users/[userId]/posts/[postId]": [getUserPostWithIdEndpoint],
} as const;

declare module "../src/types" {
  interface Register {
    fetchEndpoints: typeof fetchEndpoints;
    mutateEndpoints: typeof mutateEndpoints;
  }
}

// Mock axios
vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => ({
      defaults: {
        baseURL: "",
        headers: { common: {} },
      },
      get: vi.fn(),
      post: vi.fn(),
      request: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  },
}));

describe("API Hooks Integration", () => {
  let queryClient: QueryClient;
  let axiosInstance: ReturnType<typeof axios.create>;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    axiosInstance = axios.create();

    // Setup successful responses
    (axiosInstance.get as any).mockResolvedValue({
      data: { users: [{ id: "1", name: "John" }] },
    });
    (axiosInstance.post as any).mockResolvedValue({
      data: { id: "1", name: "John" },
    });
    (axiosInstance.request as any).mockResolvedValue({
      data: { id: "1", name: "John" },
    });

    const api = createApi({
      baseUrl: "http://api.example.com",
      queryClient,
      client: axiosInstance,
      fetchEndpoints,
      mutateEndpoints,
    });

    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <ApiProvider api={api}>{children}</ApiProvider>
      </QueryClientProvider>
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("should fetch and display data", async () => {
    const mockData = { users: [{ id: "1", name: "Test" }] };
    (axiosInstance.get as any).mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(() => useFetch({ path: "/users" }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(axiosInstance.get).toHaveBeenCalledWith("/users", {
      baseURL: "http://api.example.com",
    });
    expect(result.current.data).toEqual(mockData);
  });

  it("should handle fetch errors", async () => {
    const error = new Error("Network error");
    (axiosInstance.get as any).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useFetch({ path: "/users" }), {
      wrapper,
    });

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
        useMutate({
          path: "/users",
          method: "POST",
          onSuccess,
          onError,
          body: { name: "New User" },
        }),
      { wrapper }
    );

    const variables = { name: "New User" };
    result.current.mutate(variables);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(axiosInstance.request).toHaveBeenCalledWith({
      method: "POST",
      url: "/users",
      baseURL: "http://api.example.com",
      data: { name: "New User" },
    });
    expect(onSuccess).toHaveBeenCalledWith(
      mockResponse,
      { name: "New User" },
      undefined
    );
    expect(onError).not.toHaveBeenCalled();
  });

  it("should handle mutation errors", async () => {
    const error = new Error("Network error");
    (axiosInstance.request as any).mockRejectedValueOnce(error);

    const onSuccess = vi.fn();
    const onError = vi.fn();

    const { result } = renderHook(
      () =>
        useMutate({
          path: "/users",
          method: "POST",
          onSuccess,
          onError,
          body: { name: "New User" },
        }),
      { wrapper }
    );

    const variables = { name: "New User" };
    result.current.mutate(variables);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      error,
      { name: "New User" },
      undefined
    );
  });

  it("should throw error when path parameter is missing", () => {
    expect(() =>
      renderHook(
        () =>
          useFetch({
            path: "/users/[id]",
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
        useMutate({
          path: "/users/[id]",
          method: "PUT",
          params: { id: "123" },
          body: { name: "Updated" },
        }),
      { wrapper }
    );

    await result.current.mutateAsync({ name: "Updated" });

    expect(axiosInstance.request).toHaveBeenCalledWith({
      method: "PUT",
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
        useFetch({
          path: "/users/[userId]/posts",
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
      // @ts-expect-error - This is a test for missing params
      renderHook(() => useFetch({ path: "/users/[id]" }), { wrapper })
    ).toThrow("Missing path parameter: id");
  });

  it("should handle path with no parameters", () => {
    const { result } = renderHook(() => useFetch({ path: "/users" }), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("should handle path with multiple parameters", async () => {
    const mockData = { id: "1", title: "Test Post" };
    (axiosInstance.get as any).mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(
      () =>
        useFetch({
          path: "/users/[userId]/posts/[postId]",
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
          useFetch({
            path: "/users/[userId]/posts/[postId]",
            // @ts-expect-error - This is a test for missing params
            params: { userId: "123" },
          }),
        { wrapper }
      )
    ).toThrow("Missing path parameter: postId");
  });

  it("should handle path with invalid parameter format", () => {
    const { result } = renderHook(
      () =>
        useFetch({
          path: "/users",
          params: { id: "123" },
        }),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(true);
  });
});
