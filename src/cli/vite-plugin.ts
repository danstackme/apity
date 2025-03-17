import type { PluginOption } from "vite";
import { watchEndpoints } from "./watch";

export const apityPlugin = (): PluginOption => ({
  name: "apity",
  apply: "serve",
  configureServer() {
    watchEndpoints();
  },
  enforce: "post",
  hotUpdate: undefined,
});
