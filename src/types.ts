import { z } from "zod";
import { QueryClient } from "@tanstack/react-query";
import { AxiosInstance } from "axios";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface ApiEndpoint<
  TMethod extends HttpMethod,
  TResponse = unknown,
  TBody = unknown,
  TQuery = unknown,
> {
  method: TMethod;
  response?: z.ZodType<TResponse> | TResponse;
  body?: z.ZodType<TBody> | TBody;
  query?: z.ZodType<TQuery> | TQuery;
}

export type ApiEndpoints = {
  [path: string]:
    | ApiEndpoint<HttpMethod>[]
    | readonly ApiEndpoint<HttpMethod>[];
};

export interface ApiConfig {
  baseUrl: string;
  queryClient?: QueryClient;
  client?: AxiosInstance;
  headers?: Record<string, string>;
  endpoints: ApiEndpoints;
  middleware?: {
    before?: (config: any) => any;
    after?: (response: any) => any;
    onError?: (error: any) => any;
  };
}

export interface ApiContext {
  client: AxiosInstance;
  queryClient: QueryClient;
  config: ApiConfig;
  middleware: ((config: any) => any)[];
  endpoints: ApiEndpoints;
}

export interface Register {
  // null for now
}

export type Endpoints = Register extends { endpoints: infer T } ? T : never;

// Helper type to extract path parameters from a URL pattern
export type ExtractPathParams<TPath extends string> =
  TPath extends `${string}[${infer Param}]${infer Rest}`
    ? { [K in Param]: string } & (Rest extends `${string}[${string}]${string}`
        ? ExtractPathParams<Rest>
        : {})
    : {};

// Helper type for hook parameters
export interface FetchParams<TQuery, TParams> {
  query?: TQuery;
  params?: TParams;
}

export interface MutateParams<TBody, TParams> {
  body?: TBody;
  params?: TParams;
}
