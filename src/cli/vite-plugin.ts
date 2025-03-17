import type { Plugin } from "vite";
import { watchEndpoints } from "./watch";

export function apityPlugin(): Plugin {
  return {
    name: "apity",
    configureServer() {
      watchEndpoints();
    },
  };
}
