import type { Plugin } from "vite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apityPlugin } from "../src/cli/vite-plugin";

describe("CLI Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("vite-plugin", () => {
    it("should create a valid vite plugin", () => {
      const plugin = apityPlugin() as Plugin;
      expect(plugin.name).toBe("apity");
      expect(plugin.apply).toBe("serve");
      expect(typeof plugin.configureServer).toBe("function");
    });
  });
});
