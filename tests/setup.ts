import "@testing-library/jest-dom";
import { vi } from "vitest";
import { expect } from "vitest";

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Add custom matchers
expect.extend({});
