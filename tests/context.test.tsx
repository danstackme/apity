import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ApiProvider, useApiContext } from "../src/context";
import { QueryClient } from "@tanstack/react-query";
import axios from "axios";
import { renderHook } from "@testing-library/react";
import React from "react";
import { createApi } from "../src/createApi";

describe("ApiProvider and useApiContext", () => {
  const baseURL = "https://api.example.com";
  const client = axios.create();
  const queryClient = new QueryClient();
  const endpoints = {};

  const api = createApi({
    baseUrl: baseURL,
    client,
    queryClient,
    endpoints,
  });

  it("should provide API context to children", () => {
    function TestComponent() {
      const context = useApiContext();
      return (
        <div>
          <div data-testid="baseURL">{context.config.baseUrl}</div>
          <div data-testid="hasClient">
            {Boolean(context.client).toString()}
          </div>
          <div data-testid="hasQueryClient">
            {Boolean(context.queryClient).toString()}
          </div>
        </div>
      );
    }

    render(
      <ApiProvider api={api}>
        <TestComponent />
      </ApiProvider>
    );

    expect(screen.getByTestId("baseURL")).toHaveTextContent(baseURL);
    expect(screen.getByTestId("hasClient")).toHaveTextContent("true");
    expect(screen.getByTestId("hasQueryClient")).toHaveTextContent("true");
  });

  it("should use default axios and QueryClient when not provided", () => {
    const defaultClient = axios.create();
    const defaultQueryClient = new QueryClient();

    const defaultApi = createApi({
      baseUrl: baseURL,
      client: defaultClient,
      queryClient: defaultQueryClient,
      endpoints,
    });

    function TestComponent() {
      const context = useApiContext();
      return (
        <div>
          <div data-testid="hasClient">
            {Boolean(context.client).toString()}
          </div>
          <div data-testid="hasQueryClient">
            {Boolean(context.queryClient).toString()}
          </div>
        </div>
      );
    }

    render(
      <ApiProvider api={defaultApi}>
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

    expect(() => render(<TestComponent />)).toThrow(
      "useApiContext must be used within an ApiProvider"
    );
  });
});

describe("ApiContext", () => {
  const baseURL = "https://api.example.com";
  const client = axios.create();
  const queryClient = new QueryClient();
  const endpoints = {};

  const api = createApi({
    baseUrl: baseURL,
    client,
    queryClient,
    endpoints,
  });

  it("should throw error when useApiContext is used outside of ApiProvider", () => {
    expect(() => renderHook(() => useApiContext())).toThrow(
      "useApiContext must be used within an ApiProvider"
    );
  });

  it("should provide api context when used within ApiProvider", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ApiProvider api={api}>{children}</ApiProvider>
    );

    const { result } = renderHook(() => useApiContext(), { wrapper });

    expect(result.current).toMatchObject({
      client: expect.any(Function),
      queryClient: expect.any(Object),
      config: expect.objectContaining({ baseUrl: baseURL, endpoints: {} }),
    });
  });
});
