import { z } from "zod";
import { createApiEndpoint } from "../../../../../src/createApi";

export const GET = createApiEndpoint({
  method: "GET",
  responseSchema: z.object({
    id: z.string(),
    name: z.string(),
  }),
  querySchema: z.object({
    include: z.array(z.string()).optional(),
  }),
});

export const PUT = createApiEndpoint({
  method: "PUT",
  bodySchema: z.object({
    name: z.string(),
  }),
  responseSchema: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

export const DELETE = createApiEndpoint({
  method: "DELETE",
  responseSchema: z.void(),
});
