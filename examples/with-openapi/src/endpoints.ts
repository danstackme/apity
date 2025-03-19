import { z } from "zod";
import { ApiEndpoints, createApi, createApiEndpoint } from "@danstackme/apity";
import { AxiosRequestConfig, AxiosError } from "axios";

// Define your Zod schemas
export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
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

const getUserEndpoint = createApiEndpoint({
  method: "GET",
  response: UserSchema,
  query: QuerySchema,
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

export const endpoints = {
  "/users": [getUsersEndpoint, createUserEndpoint],
  "/users/[id]": [getUserEndpoint, updateUserEndpoint, deleteUserEndpoint],
} as const;

// Create and export the API instance
export const api = createApi({
  baseUrl: "https://api.example.com",
  endpoints,
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
