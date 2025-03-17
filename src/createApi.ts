import { QueryClient } from "@tanstack/react-query";
import axios from "axios";
import type {
  ApiConfig,
  ApiContext,
  ApiEndpoint,
  HttpMethod,
  ApiRouteDefinition,
} from "./types";
import { z } from "zod";

export function createApi<TApiTree extends ApiRouteDefinition>(
  config: ApiConfig<TApiTree>
): ApiContext<TApiTree> {
  const client =
    config.client ??
    axios.create({
      baseURL: config.baseUrl,
      headers: config.headers,
    });

  const queryClient = config.queryClient ?? new QueryClient();

  return {
    client,
    queryClient,
    config,
    middlewares: [],
    apiTree: config.apiTree,
  };
}

export function createApiEndpoint<
  TResponse = unknown,
  TBody = void,
  TQuery = void,
  TParams extends Record<string, string> = Record<string, string>
>(config: {
  method: HttpMethod;
  responseSchema?: z.ZodType<TResponse>;
  bodySchema?: z.ZodType<TBody>;
  querySchema?: z.ZodType<TQuery>;
}): ApiEndpoint<TResponse, TBody, TQuery, TParams> {
  return {
    ...config,
    response: {} as TResponse,
    body: {} as TBody,
    query: {} as TQuery,
    params: {} as TParams,
  };
}
