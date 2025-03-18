import { z } from "zod";
import { QueryClient } from "@tanstack/react-query";
import { AxiosInstance } from "axios";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface ApiEndpoint<
  TResponse = unknown,
  TBody = unknown,
  TQuery = unknown,
  TParams = unknown,
> {
  method: HttpMethod;
  responseSchema: z.ZodType<TResponse>;
  bodySchema?: z.ZodType<TBody>;
  querySchema?: z.ZodType<TQuery>;
  paramSchema?: z.ZodType<TParams>;
}

export type ExtractRouteParams<T extends string> = string extends T
  ? Record<string, string>
  : T extends `${string}[${infer Param}]${infer Rest}`
    ? { [K in Param | keyof ExtractRouteParams<Rest>]: string }
    : Record<string, never>;

export interface Register {
  apiTree: ApiRouteDefinition;
}

export type ApiRouteDefinition = {
  [path: string]: {
    [method in HttpMethod]?: ApiEndpoint;
  };
};

export interface ApiConfig<TApiTree extends ApiRouteDefinition> {
  baseUrl: string;
  headers?: Record<string, string>;
  client?: AxiosInstance;
  queryClient?: QueryClient;
  apiTree: TApiTree;
}

export interface ApiContext<TApiTree extends ApiRouteDefinition> {
  client: AxiosInstance;
  queryClient: QueryClient;
  config: ApiConfig<TApiTree>;
  middlewares: any[];
  apiTree: TApiTree;
}

export interface ApiRoute<
  TResponse = unknown,
  TBody = unknown,
  TQuery = unknown,
  TParams = unknown,
> {
  method: HttpMethod;
  response: z.ZodType<TResponse>;
  body?: z.ZodType<TBody>;
  query?: z.ZodType<TQuery>;
  params?: z.ZodType<TParams>;
}
