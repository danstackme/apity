import { createApi, createApiEndpoint } from "@danstackme/apity";
import { AxiosError, AxiosRequestConfig } from "axios";
import { z } from "zod";
// Define your Zod schemas
export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

export const UserPutSchema = z.object({
  test: z.string(),
});

export const UsersResponseSchema = z.array(UserSchema);

export const CreateUserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

export const QuerySchema = z.object({
  limit: z.number(),
  offset: z.number().optional(),
});

const getUsersEndpoint = createApiEndpoint({
  method: "GET",
  response: UsersResponseSchema,
  query: QuerySchema,
});

const createUserEndpoint = createApiEndpoint({
  method: "POST",
  response: UserSchema,
  body: CreateUserSchema,
});

const updateUsersEndpoint = createApiEndpoint({
  method: "PUT",
  response: UserPutSchema,
  body: UserPutSchema,
});

const getUserEndpoint = createApiEndpoint({
  method: "GET",
  response: UserSchema,
});

const updateUserEndpoint = createApiEndpoint({
  method: "PUT",
  response: UserSchema,
  body: CreateUserSchema,
});

const deleteUserEndpoint = createApiEndpoint({
  method: "DELETE",
  response: z.void(),
});

export const fetchEndpoints = {
  "/users": [getUsersEndpoint],
  "/users/[id]": [getUserEndpoint],
} as const;

export const mutateEndpoints = {
  "/users": [createUserEndpoint, updateUsersEndpoint],
  "/users/[id]": [updateUserEndpoint, deleteUserEndpoint],
} as const;

// Create and export the API instance
export const api = createApi({
  baseUrl: "https://api.example.com",
  fetchEndpoints,
  mutateEndpoints,
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
