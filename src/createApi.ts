import { z } from "zod";
import { QueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ApiConfig, ApiEndpoints, ApiContext } from "./types";
import { ApiEndpoint } from "./types";

export function createApiEndpoint<
  TResponse = unknown,
  TBody = unknown,
  TQuery = unknown,
>(config: {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  response?: z.ZodType<TResponse>;
  body?: z.ZodType<TBody>;
  query?: z.ZodType<TQuery>;
}): ApiEndpoint<TResponse, TBody, TQuery> {
  return {
    ...config,
    method: config.method,
    response: config.response,
    body: config.body,
    query: config.query,
  };
}

export function createApi<T extends ApiEndpoints>(
  config: ApiConfig
): ApiContext {
  const queryClient = config.queryClient || new QueryClient();
  const client = config.client || axios.create();

  // Configure client
  client.defaults.baseURL = config.baseUrl;

  // Set headers directly on the client's headers object
  if (config.headers) {
    Object.assign(client.defaults.headers, config.headers);
  }

  // Initialize middleware array
  const middlewareFns: ((config: any) => any)[] = [];

  // Add middleware functions to array if they exist
  if (config.middleware) {
    if (config.middleware.before) {
      middlewareFns.push(config.middleware.before);
      client.interceptors.request.use(config.middleware.before);
    }
    if (config.middleware.after) {
      middlewareFns.push(config.middleware.after);
      client.interceptors.response.use(config.middleware.after);
    }
    if (config.middleware.onError) {
      middlewareFns.push(config.middleware.onError);
      client.interceptors.response.use(undefined, config.middleware.onError);
    }
  }

  return {
    client,
    queryClient,
    config,
    middleware: middlewareFns,
    endpoints: config.endpoints as T,
  };
}
