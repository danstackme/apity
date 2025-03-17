import { createApi, createApiEndpoint } from './createApi';
import { z } from 'zod';

export const api = createApi({
  apiTree: {
    '/pets': {
      GET: createApiEndpoint({
        method: 'GET',
        responseSchema: z.object({"pets":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string"},"name":{"type":"string"},"type":{"type":"string"}}}}}),
      }),
      POST: createApiEndpoint({
        method: 'POST',
        responseSchema: z.object({"id":{"type":"string"},"name":{"type":"string"},"type":{"type":"string"}}),
        bodySchema: z.object({"name":{"type":"string"},"type":{"type":"string"}}),
      }),
    },
    '/pets/[id]': {
      GET: createApiEndpoint({
        method: 'GET',
        responseSchema: z.object({"id":{"type":"string"},"name":{"type":"string"},"type":{"type":"string"}}),
      }),
      PUT: createApiEndpoint({
        method: 'PUT',
        responseSchema: z.object({"id":{"type":"string"},"name":{"type":"string"},"type":{"type":"string"}}),
        bodySchema: z.object({"name":{"type":"string"},"type":{"type":"string"}}),
      }),
    },
  },
});
