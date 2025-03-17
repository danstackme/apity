import { z } from "zod";

const PetsSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
});

export const GET = {
  method: "GET",
  responseSchema: z.array(PetsSchema),
};

export const POST = {
  method: "POST",
  responseSchema: PetsSchema,
  bodySchema: z.object({
    title: z.string(),
    content: z.string(),
  }),
  params: { id: z.string() },
};

export const PATCH = {
  method: "PATCH",
  responseSchema: PetsSchema,
};
