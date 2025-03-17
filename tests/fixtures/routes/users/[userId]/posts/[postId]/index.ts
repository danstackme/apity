import { z } from "zod";
import { createApiEndpoint } from "../../../../../../../src/createApi";

export const GET = createApiEndpoint({
  method: "GET",
  responseSchema: z.object({
    id: z.string(),
    title: z.string(),
    userId: z.string(),
  }),
});
