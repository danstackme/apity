import { z } from "zod";
import { createApiEndpoint } from "@danstackme/apity";

const PetsSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
});

export const GET = createApiEndpoint({
  method: "GET",
  responseSchema: z.array(PetsSchema),
});

export const POST = createApiEndpoint({
  method: "POST",
  responseSchema: PetsSchema,
  bodySchema: z.object({
    title: z.string(),
    content: z.string(),
  }),
  paramSchema: z.object({ id: z.string() }),
});
