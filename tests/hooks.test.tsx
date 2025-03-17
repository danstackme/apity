import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiProvider } from "../src/context";
import { useFetch, useMutate } from "../src/hooks";
import { ApiEndpoint, ApiRouteDefinition } from "../src/types";
import React from "react";
import axios from "axios";

type UserEndpoint = ApiEndpoint<
  { id: string; name: string }, // Response
  { name: string }, // Body
  {}, // Query
  { id: string } // Params
>;

// Mock API tree
const mockApiTree: ApiRouteDefinition = {
  "/users/[id]": {
    GET: {} as UserEndpoint,
    PUT: {} as UserEndpoint,
  },
};

vi.mock("../src/generated/apiTree.gen", () => ({
  ApiTree: mockApiTree,
}));

// Test component that uses both hooks
function TestComponent({ id }: { id: string }) {
  const { data } = useFetch("/users/[id]", {
    params: { id },
  });

  const { mutate } = useMutate("/users/[id]", {
    method: "PUT",
    params: { id },
  });

  return (
    <div>
      <div data-testid="user-name">{data?.name}</div>
      <button onClick={() => mutate({ name: "Updated" })}>Update</button>
    </div>
  );
}

describe("API Hooks Integration", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Mock the generated API tree module
    vi.mock("../src/generated/apiTree.gen", () => ({
      default: {
        "/users/[id]": {
          GET: {} as UserEndpoint,
          PUT: {} as UserEndpoint,
        },
      },
    }));
  });

  afterEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ApiProvider baseURL="https://api.example.com" client={axios}>
        {children}
      </ApiProvider>
    </QueryClientProvider>
  );

  it("should fetch and display data", async () => {
    const mockData = { id: "1", name: "John" };
    vi.spyOn(axios, "get").mockResolvedValueOnce({
      data: mockData,
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    });

    const { getByTestId } = render(<TestComponent id="1" />, { wrapper });

    await waitFor(() => {
      expect(getByTestId("user-name")).toHaveTextContent("John");
    });
  });

  it("should handle fetch errors", async () => {
    const error = new Error("Network error");
    vi.spyOn(axios, "get").mockRejectedValueOnce(error);

    const { result } = renderHook(
      () =>
        useFetch("/users/[id]", {
          params: { id: "1" },
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });

  it("should handle mutations", async () => {
    const mockResponse = { id: "1", name: "Updated" };
    vi.spyOn(axios, "request").mockResolvedValueOnce({
      data: mockResponse,
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    });

    const { result } = renderHook(
      () =>
        useMutate("/users/[id]", {
          method: "PUT",
          params: { id: "1" },
        }),
      { wrapper }
    );

    await result.current.mutateAsync({ name: "Updated" });

    expect(axios.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "put",
        url: "/users/1",
        baseURL: "https://api.example.com",
        data: { name: "Updated" },
      })
    );
  });
});
