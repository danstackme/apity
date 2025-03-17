import { createApi } from "type-safe-api";
import { apiTree } from "../src/generated/apiTree.gen";

export const api = createApi({
  baseUrl: "https://api.example.com",
  apiTree,
});

// Type augmentation for global type safety
declare module "type-safe-api" {
  interface Register {
    router: typeof api;
  }
}
