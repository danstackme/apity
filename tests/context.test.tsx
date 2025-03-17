import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ApiProvider, useApiContext } from "../src/context";
import { QueryClient } from "@tanstack/react-query";
import axios, { AxiosInstance } from "axios";
import { renderHook } from "@testing-library/react";
import React from "react";

describe("ApiProvider and useApiContext", () => {
  const baseURL = "https://api.example.com";
  const client = axios.create() as AxiosInstance;
  const queryClient = new QueryClient();

  it("should provide API context to children", () => {
    function TestComponent() {
      const context = useApiContext();
      return (
        <div>
          <div data-testid="baseURL">{context.baseURL}</div>
          <div data-testid="hasClient">{context.client ? "true" : "false"}</div>
          <div data-testid="hasQueryClient">
            {context.queryClient ? "true" : "false"}
          </div>
        </div>
      );
    }

    render(
      <ApiProvider baseURL={baseURL} client={client} queryClient={queryClient}>
        <TestComponent />
      </ApiProvider>
    );

    expect(screen.getByTestId("baseURL")).toHaveTextContent(baseURL);
    expect(screen.getByTestId("hasClient")).toHaveTextContent("true");
    expect(screen.getByTestId("hasQueryClient")).toHaveTextContent("true");
  });

  it("should use default axios and QueryClient when not provided", () => {
    function TestComponent() {
      const context = useApiContext();
      return (
        <div>
          <div data-testid="hasClient">{context.client ? "true" : "false"}</div>
          <div data-testid="hasQueryClient">
            {context.queryClient ? "true" : "false"}
          </div>
        </div>
      );
    }

    render(
      <ApiProvider baseURL={baseURL}>
        <TestComponent />
      </ApiProvider>
    );

    expect(screen.getByTestId("hasClient")).toHaveTextContent("true");
    expect(screen.getByTestId("hasQueryClient")).toHaveTextContent("true");
  });

  it("should throw error when useApiContext is used outside ApiProvider", () => {
    function TestComponent() {
      useApiContext();
      return null;
    }

    expect(() => {
      render(<TestComponent />);
    }).toThrow("useApiContext must be used within an ApiProvider");
  });
});

describe("ApiContext", () => {
  const baseURL = "https://api.example.com";
  const client = axios.create() as AxiosInstance;
  const queryClient = new QueryClient();

  it("should throw error when useApiContext is used outside of ApiProvider", () => {
    expect(() => {
      renderHook(() => useApiContext());
    }).toThrow("useApiContext must be used within an ApiProvider");
  });

  it("should provide api context when used within ApiProvider", () => {
    const { result } = renderHook(() => useApiContext(), {
      wrapper: ({ children }) => (
        <ApiProvider
          baseURL={baseURL}
          client={client}
          queryClient={queryClient}
        >
          {children}
        </ApiProvider>
      ),
    });

    expect(result.current).toMatchObject({
      baseURL,
      client: expect.any(Function),
      queryClient: expect.any(Object),
      apiTree: expect.any(Object),
    });
  });
});
