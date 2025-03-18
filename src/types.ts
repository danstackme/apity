import { z } from "zod";
import { QueryClient } from "@tanstack/react-query";
import { AxiosInstance } from "axios";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface ApiEndpoint<
  TResponse = unknown,
  TBody = unknown,
  TQuery = unknown,
> {
  method: HttpMethod;
  response?: z.ZodType<TResponse>;
  body?: z.ZodType<TBody>;
  query?: z.ZodType<TQuery>;
}

export type ApiEndpoints = {
  [path: string]: ApiEndpoint[] | readonly ApiEndpoint[];
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
export type ExtractPathParams<T extends string> = string extends T
  ? Record<string, string>
  : T extends `${string}[${infer Param}]${infer Rest}`
    ? { [K in Param | keyof ExtractPathParams<Rest>]: string }
    : T extends `${string}[${infer Param}]`
      ? { [K in Param]: string }
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
