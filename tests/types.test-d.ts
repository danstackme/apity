import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { ExtractRouteParams } from "../src/types";
import { createApiEndpoint } from "../src/createApi";

describe("Type Tests", () => {
  it("should correctly type path parameters", () => {
    type Params = ExtractRouteParams<"/users/[id]/posts/[postId]">;
    expectTypeOf<Params>().toEqualTypeOf<{
      id: string;
      postId: string;
    }>();
  });

  it("should correctly type API endpoints", () => {
    const endpoint = createApiEndpoint({
      method: "GET",
      responseSchema: z.object({ id: z.string() }),
      querySchema: z.object({ include: z.array(z.string()).optional() }),
    });

    type EndpointType = typeof endpoint;
    expectTypeOf<EndpointType["response"]>().toEqualTypeOf<{ id: string }>();
    expectTypeOf<EndpointType["query"]>().toEqualTypeOf<{
      include?: string[] | undefined;
    }>();
  });

  it("should enforce path parameter constraints", () => {
    const endpoint = createApiEndpoint<
      { id: string },
      void,
      void,
      { id: string }
    >({
      method: "GET",
      responseSchema: z.object({ id: z.string() }),
    });

    type EndpointType = typeof endpoint;
    expectTypeOf<EndpointType["params"]>().toEqualTypeOf<{ id: string }>();
  });
});
