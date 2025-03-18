import { z } from "zod";
import { createApi, createApiEndpoint } from "@danstackme/apity";
import { AxiosRequestConfig, AxiosError } from "axios";

// Define your Zod schemas
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const UsersResponseSchema = z.array(UserSchema);

const CreateUserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

const QuerySchema = z.object({
  limit: z.number().optional(),
  offset: z.number().optional(),
});

export type ApiEndpoints = {
  "/users": {
    GET: {
      response: z.infer<typeof UsersResponseSchema>;
      query: z.infer<typeof QuerySchema>;
    };
    POST: {
      response: z.infer<typeof UserSchema>;
      body: z.infer<typeof CreateUserSchema>;
    };
  };
  "/users/:id": {
    GET: {
      response: z.infer<typeof UserSchema>;
    };
    PUT: {
      response: z.infer<typeof UserSchema>;
      body: z.infer<typeof CreateUserSchema>;
    };
    DELETE: {
      response: void;
    };
  };
};

declare module "@danstackme/apity" {
  interface Register {
    apiTree: ApiEndpoints;
  }
}

// Create and export the API instance
export const api = createApi({
  baseUrl: "https://api.example.com",
  endpoints: {
    "/users": [
      createApiEndpoint({
        method: "GET",
        response: UsersResponseSchema,
        query: QuerySchema,
      }),
      createApiEndpoint({
        method: "POST",
        response: UserSchema,
        body: CreateUserSchema,
      }),
    ],
    "/users/:id": [
      createApiEndpoint({
        method: "GET",
        response: UserSchema,
      }),
      createApiEndpoint({
        method: "PUT",
        response: UserSchema,
        body: CreateUserSchema,
      }),
      createApiEndpoint({
        method: "DELETE",
        response: z.void(),
      }),
    ],
  },
  middleware: {
    before: (config: AxiosRequestConfig) => {
      // Add authentication header
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      };
      return config;
    },
    onError: (error: AxiosError) => {
      // Handle unauthorized errors
      if (error.response?.status === 401) {
        // Redirect to login or refresh token
        window.location.href = "/login";
      }
      return Promise.reject(error);
    },
  },
});
