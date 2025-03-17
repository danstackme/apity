import "@testing-library/jest-dom/vitest";
import { vi, expect } from "vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Add custom matchers
expect.extend({});
