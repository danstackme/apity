import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, renderHook, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { ApiProvider } from "../src/context";
import { useFetch, useMutate } from "../src/hooks";
import { ApiEndpoint } from "../src/types";
import React from "react";
import axios from "axios";

type UserEndpoint = ApiEndpoint<
  { id: string; name: string }, // Response
  { name: string }, // Body
  {}, // Query
  { id: string } // Params
>;

// Test component that uses both hooks
function TestComponent({ id }: { id: string }) {
  const { data } = useFetch<"/users/[id]", UserEndpoint>("/users/[id]", {
    params: { id },
  });

  const { mutate } = useMutate<"/users/[id]", "PUT">("/users/[id]", {
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
  });

  afterEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ApiProvider
      baseURL="https://api.example.com"
      client={axios}
      queryClient={queryClient}
    >
      {children}
    </ApiProvider>
  );

  it("should fetch and display data", async () => {
    const mockData = { id: "1", name: "John" };
    vi.spyOn(axios, "get").mockResolvedValueOnce({
      data: mockData,
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
        useFetch<"/users/[id]", UserEndpoint>("/users/[id]", {
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
    });

    const { result } = renderHook(
      () =>
        useMutate<"/users/[id]", "PUT">("/users/[id]", {
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
