import type { PluginOption } from "vite";
import { watchEndpoints } from "./watch";

const apityPlugin = (): PluginOption => ({
  name: "apity",
  apply: "serve",
  configureServer() {
    watchEndpoints();
  },
});

export default apityPlugin;
export { apityPlugin };
