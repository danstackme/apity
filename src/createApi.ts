import axios from "axios";
import type { ApiConfig, ApiContext, ApiEndpoint } from "./types";
import { z } from "zod";
import { QueryClient } from "@tanstack/react-query";

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

export function createApi(
  config: ApiConfig
): ApiContext & { middlewares: any[]; apiTree: any } {
  const client =
    config.client ||
    axios.create({
      baseURL: config.baseUrl,
      headers: config.headers,
    });

  // If using a provided client, update its config
  if (config.client) {
    config.client.defaults.baseURL = config.baseUrl;
    if (config.headers) {
      Object.assign(config.client.defaults.headers, config.headers);
    }
  }

  const middlewares: any[] = [];

  // Add middleware if provided
  if (config.middleware) {
    if (config.middleware.before) {
      client.interceptors.request.use(config.middleware.before);
      middlewares.push(config.middleware.before);
    }
    if (config.middleware.after) {
      client.interceptors.response.use(config.middleware.after);
      middlewares.push(config.middleware.after);
    }
    if (config.middleware.onError) {
      client.interceptors.response.use(undefined, config.middleware.onError);
      middlewares.push(config.middleware.onError);
    }
  }

  return {
    client,
    queryClient: config.queryClient ?? new QueryClient(),
    config,
    middlewares,
    apiTree: config.endpoints,
  };
}
