import { z } from "zod";
import { createApiEndpoint } from "../../createApi";
import type { ExtractRouteParams } from "../../types";

type params = ExtractRouteParams<"/users/[id]">;

const endpoints = {
  GET: createApiEndpoint<
    { id: string; name: string },
    void,
    { include?: string[] },
    params
  >({
    method: "GET",
    responseSchema: z.object({
      id: z.string(),
      name: z.string(),
    }),
    querySchema: z.object({
      include: z.array(z.string()).optional(),
    }),
  }),

  PUT: createApiEndpoint<
    { id: string; name: string },
    { name: string },
    void,
    params
  >({
    method: "PUT",
    bodySchema: z.object({
      name: z.string(),
    }),
    responseSchema: z.object({
      id: z.string(),
      name: z.string(),
    }),
  }),
} as const;

export default endpoints;
