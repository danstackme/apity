import type { PluginOption } from "vite";
import { watchEndpoints } from "./watch";

const apityPlugin = (): PluginOption => {
  return {
    name: "apity",
    apply: "serve",
    configureServer() {
      watchEndpoints();
    },
    config: () => ({
      resolve: {
        alias: {
          // Handle Node.js built-in modules internally
          tty: "process",
        },
      },
      optimizeDeps: {
        esbuildOptions: {
          define: {
            global: "globalThis",
          },
        },
      },
    }),
  };
};

export { apityPlugin };
