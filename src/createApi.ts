import { QueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  ApiConfig,
  ApiContext,
  FetchEndpoint,
  HttpMethod,
  MutateEndpoint,
} from "./types";
import { z } from "zod";
export function createApiEndpoint<
  TMethod extends HttpMethod,
  TResponse = unknown,
  TBody = unknown,
  TQuery = unknown,
>(config: {
  method: TMethod;
  response?: z.ZodType<TResponse>;
  body?: z.ZodType<TBody>;
  query?: z.ZodType<TQuery>;
}): TMethod extends "GET"
  ? FetchEndpoint<TResponse, TBody, TQuery>
  : TMethod extends Exclude<HttpMethod, "GET">
    ? MutateEndpoint<TMethod, TResponse, TBody, TQuery>
    : never {
  return {
    ...config,
    method: config.method,
    response: config.response,
    body: config.body,
    query: config.query,
  } as TMethod extends "GET"
    ? FetchEndpoint<TResponse, TBody, TQuery>
    : TMethod extends Exclude<HttpMethod, "GET">
      ? MutateEndpoint<TMethod, TResponse, TBody, TQuery>
      : never;
}

export function createApi(config: ApiConfig): ApiContext {
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
    fetchEndpoints: config.fetchEndpoints,
    mutateEndpoints: config.mutateEndpoints,
  };
}
