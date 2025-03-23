import { createApi, createApiEndpoint } from './createApi';
import { z } from 'zod';

const GET_pets = createApiEndpoint({
  method: 'GET',
  response: z.array(z.unknown()),
  query: z.object({
        tags: z.array(z.string()).optional(),
        limit: z.number().optional()
      }),
});

const POST_pets = createApiEndpoint({
  method: 'POST',
  response: z.unknown(),
});

const GET_pets_type_properties = createApiEndpoint({
  method: 'GET',
  response: z.unknown(),
});

const DELETE_pets_type_properties = createApiEndpoint({
  method: 'DELETE',
  response: z.void(),
});

export const fetchEndpoints = {
  '/pets': [GET_pets, POST_pets],
  '/pets/[id]': [GET_pets_type_properties, DELETE_pets_type_properties],
} as const;

export const mutateEndpoints = {
} as const;

export const api = createApi({
  baseUrl: 'https://petstore.swagger.io/v2',
  fetchEndpoints,
  mutateEndpoints,
});
