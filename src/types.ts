import { QueryClient, UseQueryOptions } from "@tanstack/react-query";
import { AxiosInstance } from "axios";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface Register {
  // null for now
}

export type ConsumerFetchEndpoints = Register extends {
  fetchEndpoints: infer T;
}
  ? T
  : never;

export type ConsumerMutateEndpoints = Register extends {
  mutateEndpoints: infer T;
}
  ? T
  : never;

export interface ApiEndpoint<
  TMethod extends HttpMethod,
  TResponse = unknown,
  TBody = unknown,
  TQuery = unknown,
> {
  method: TMethod;
  response?: TResponse;
  body?: TBody;
  query?: TQuery;
}

type AnyApiEndpoint = ApiEndpoint<any, any, any, any>;

export type FetchEndpoint<TResponse, TBody, TQuery> = ApiEndpoint<
  "GET",
  TResponse,
  TBody,
  TQuery
>;

export type MutateEndpoint<
  TMethod extends Exclude<HttpMethod, "GET">,
  TResponse,
  TBody,
  TQuery,
> = ApiEndpoint<TMethod, TResponse, TBody, TQuery>;

export type ApiEndpoints = {
  [path: string]:
    | FetchEndpoint<any, any, any>[]
    | MutateEndpoint<Exclude<HttpMethod, "GET">, any, any, any>[]
    | readonly ApiEndpoint<HttpMethod>[];
};

export interface ApiConfig {
  baseUrl: string;
  queryClient?: QueryClient;
  client?: AxiosInstance;
  headers?: Record<string, string>;
  fetchEndpoints: ApiEndpoints;
  mutateEndpoints: ApiEndpoints;
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
  fetchEndpoints: ApiEndpoints;
  mutateEndpoints: ApiEndpoints;
}

export type GetPathParamType<TPath extends string> =
  HasPathParams<TPath> extends true
    ? { params: ExtractPathParams<TPath> }
    : { params?: ExtractPathParams<TPath> };

export type UseFetchOptionsType<TPath extends Path> = Omit<
  UseQueryOptions<
    ConsumerFetchEndpoints[TPath][number]["response"],
    Error,
    ConsumerFetchEndpoints[TPath][number]["response"],
    any
  >,
  "queryKey" | "queryFn"
> & {
  path: TPath;
} & GetPathParamType<TPath> &
  GetQueryParamType<TPath, "GET">;

export type GetQueryParamType<
  TPath extends Path,
  TMethod extends HttpMethod,
  TEndpoint extends AnyApiEndpoint = EndpointsByMethod<TPath, TMethod>,
> =
  HasRequiredField<NonNullable<TEndpoint["query"]>> extends true
    ? NonNullable<RequiredQueryParams<TEndpoint>>
    : NonNullable<OptionalQueryParams<TEndpoint>>;

// Helper type to extract path parameters from a URL pattern
export type ExtractPathParams<TPath extends string> =
  TPath extends `${string}[${infer Param}]${infer Rest}`
    ? {
        [K in Param]: string | number;
      } & (Rest extends `${string}[${string}]${string}`
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

export type Path = keyof ConsumerFetchEndpoints & string;
export type Method<P extends Path> = keyof ConsumerFetchEndpoints[P] & string;

export type EndpointsByMethod<
  TPath extends Path,
  TMethod extends HttpMethod,
> = Extract<
  TMethod extends "GET"
    ? ConsumerFetchEndpoints[TPath][number]
    : ConsumerMutateEndpoints[TPath][number],
  TMethod extends "GET"
    ? FetchEndpoint<any, any, any>
    : TMethod extends Exclude<HttpMethod, "GET">
      ? MutateEndpoint<TMethod, any, any, any>
      : never
>;

type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends { [P in K]: T[K] } ? never : K;
}[keyof T];

export type HasRequiredField<T> = RequiredKeys<T> extends never ? false : true;

export type HasPathParams<T extends string> =
  T extends `${string}[${string}]${string}` ? true : false;

export type OptionalQueryParams<TEndpoint extends AnyApiEndpoint> = {
  query?: NonNullable<TEndpoint["query"]>;
};

export type RequiredQueryParams<TEndpoint extends AnyApiEndpoint> = {
  query: NonNullable<TEndpoint["query"]>;
};
