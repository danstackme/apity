import { z } from "zod";
import { createApiEndpoint } from "../../../../src/createApi";

export const GET = createApiEndpoint({
  method: "GET",
  responseSchema: z.object({
    users: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
      })
    ),
  }),
});

export const POST = createApiEndpoint({
  method: "POST",
  bodySchema: z.object({
    name: z.string(),
  }),
  responseSchema: z.object({
    id: z.string(),
    name: z.string(),
  }),
});
