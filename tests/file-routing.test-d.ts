import { expectTypeOf } from "vitest";
import type { GeneratedApiTree } from "./fixtures/generated/apiTree.gen";
import type { ApiEndpoint } from "../src/types";

// Test nested route with parameters
expectTypeOf<
  ApiEndpoint<
    { id: string; title: string; userId: string },
    void,
    void,
    Record<string, string>
  >
>(({} as GeneratedApiTree)["/users/[userId]/posts/[postId]"].GET);

// Test route with single parameter
expectTypeOf<
  ApiEndpoint<
    { id: string; name: string },
    void,
    { include?: string[] },
    Record<string, string>
  >
>(({} as GeneratedApiTree)["/users/[id]"].GET);

// Test route with query parameters
expectTypeOf<
  ApiEndpoint<
    { users: { id: string; name: string }[] },
    void,
    void,
    Record<string, string>
  >
>(({} as GeneratedApiTree)["/users"].GET);

// Test route with request body
expectTypeOf<
  ApiEndpoint<
    { id: string; name: string },
    { name: string },
    void,
    Record<string, string>
  >
>(({} as GeneratedApiTree)["/users"].POST);

// Test route with void response
expectTypeOf<ApiEndpoint<void, void, void, Record<string, string>>>(
  ({} as GeneratedApiTree)["/users/[id]"].DELETE
);
