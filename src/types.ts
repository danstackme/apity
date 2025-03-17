import { AxiosInstance, AxiosRequestConfig } from "axios";
import { QueryClient } from "@tanstack/react-query";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiEndpoint<
  TResponse = unknown,
  TBody = void,
  TQuery = void,
  TParams extends Record<string, string> = Record<string, string>
> = {
  response: TResponse;
  body: TBody;
  query: TQuery;
  params: TParams;
  method: HttpMethod;
};

export type ApiEndpointGroup = {
  [K in HttpMethod]?: ApiEndpoint<any, any, any, any>;
};

export type ApiRouteDefinition = {
  [path: string]: ApiEndpointGroup;
};

export interface ApiConfig<TApiTree extends ApiRouteDefinition> {
  baseUrl: string;
  headers?: Record<string, string>;
  client?: AxiosInstance;
  queryClient?: QueryClient;
  apiTree: TApiTree;
}

export type Middleware = (
  config: AxiosRequestConfig
) => AxiosRequestConfig | Promise<AxiosRequestConfig>;

export interface ApiContext<
  TApiTree extends ApiRouteDefinition = ApiRouteDefinition
> {
  client: AxiosInstance;
  queryClient: QueryClient;
  config: ApiConfig<TApiTree>;
  middlewares: Middleware[];
  apiTree: TApiTree;
}

// Type helpers for path parameters
export type ExtractRouteParams<T extends string> = string extends T
  ? Record<string, string>
  : T extends `${string}[${infer Param}]${infer Rest}`
  ? { [K in Param | keyof ExtractRouteParams<Rest>]: string }
  : {};

// Interface for registering API types
export interface Register {
  router: ApiContext;
}
