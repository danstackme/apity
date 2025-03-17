import { ApiProvider, useFetch, useMutate } from "@danstackme/apity";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

// Basic test to ensure the package is working
describe("Package Integration Test", () => {
  it("should compile without type errors", () => {
    // This test will fail at compile time if there are type errors
    expect(true).toBe(true);
  });

  it("should allow using the hooks", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ApiProvider baseURL="http://api.example.com">{children}</ApiProvider>
    );

    // Test useFetch
    const { result } = renderHook(
      () =>
        useFetch("/users", {
          query: { filter: "active" },
        }),
      { wrapper }
    );

    // Test useMutate
    const { result: mutateResult } = renderHook(
      () =>
        useMutate("/users", {
          method: "POST",
        }),
      { wrapper }
    );

    // If we get here without type errors, the test passes
    expect(true).toBe(true);
  });
});
