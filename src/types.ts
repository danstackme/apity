import {
  QueryClient,
  UseMutationOptions,
  UseQueryOptions,
} from "@tanstack/react-query";
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

export type UseFetchOptionsType<TPath extends FetchPath> = Omit<
  UseQueryOptions<
    FetchResponseFor<TPath, "GET">,
    Error,
    FetchResponseFor<TPath, "GET">,
    any
  >,
  "queryKey" | "queryFn"
> & {
  path: TPath;
} & GetPathParamType<TPath> &
  GetQueryParamType<TPath, "GET">;

export type UseMutateOptionsType<
  TPath extends MutatePath,
  TMethod extends AvailableMutateMethods<TPath>,
> = Omit<
  UseMutationOptions<
    MutateResponseFor<TPath, TMethod>,
    Error,
    MutateBodyFor<TPath, TMethod>
  >,
  "mutationFn"
> & {
  path: TPath;
  method: TMethod;
} & GetPathParamType<TPath> &
  GetBodyParamType<TPath, TMethod> &
  GetQueryParamType<TPath, TMethod>;

export type GetQueryParamType<
  TPath extends FetchPath | MutatePath,
  TMethod extends HttpMethod,
  TEndpoint extends AnyApiEndpoint = EndpointsByMethod<TPath, TMethod>,
> =
  HasRequiredField<NonNullable<TEndpoint["query"]>> extends true
    ? NonNullable<RequiredQueryParams<TEndpoint>>
    : NonNullable<OptionalQueryParams<TEndpoint>>;

export type GetBodyParamType<
  TPath extends FetchPath | MutatePath,
  TMethod extends HttpMethod,
  TEndpoint extends AnyApiEndpoint = EndpointsByMethod<TPath, TMethod>,
> = TMethod extends "POST"
  ? NonNullable<RequiredBodyParams<Extract<TEndpoint, { method: "POST" }>>>
  : TMethod extends "PUT"
    ? NonNullable<RequiredBodyParams<Extract<TEndpoint, { method: "PUT" }>>>
    : TMethod extends "DELETE"
      ? NonNullable<
          RequiredBodyParams<Extract<TEndpoint, { method: "DELETE" }>>
        >
      : TMethod extends "PATCH"
        ? NonNullable<
            RequiredBodyParams<Extract<TEndpoint, { method: "PATCH" }>>
          >
        : never;

export type RequiredBodyParams<TEndpoint extends AnyApiEndpoint> = {
  body: NonNullable<TEndpoint["body"]>;
};

export type OptionalBodyParams<TEndpoint extends AnyApiEndpoint> = {
  body?: NonNullable<TEndpoint["body"]>;
};

// Helper type to extract path parameters from a URL pattern
export type ExtractPathParams<TPath extends string> =
  TPath extends `${string}[${infer Param}]${infer Rest}`
    ? {
        [K in Param]: string | number;
      } & (Rest extends `${string}[${string}]${string}`
        ? ExtractPathParams<Rest>
        : {})
    : {};

export type FetchPath = keyof ConsumerFetchEndpoints & string;
export type MutatePath = keyof ConsumerMutateEndpoints & string;

export type MutateMethodsFor<P extends MutatePath, M extends HttpMethod> =
  Extract<ConsumerMutateEndpoints[P][number]["method"], M> extends never
    ? never
    : M;

export type MutateResponseFor<P extends MutatePath, M extends HttpMethod> =
  Extract<ConsumerMutateEndpoints[P][number]["method"], M> extends never
    ? never
    : Extract<ConsumerMutateEndpoints[P][number], { method: M }>["response"];

export type MutateBodyFor<P extends MutatePath, M extends HttpMethod> =
  Extract<ConsumerMutateEndpoints[P][number]["method"], M> extends never
    ? never
    : Extract<ConsumerMutateEndpoints[P][number], { method: M }>["body"];

export type FetchResponseFor<P extends FetchPath, M extends HttpMethod> =
  Extract<ConsumerFetchEndpoints[P][number]["method"], M> extends never
    ? never
    : Extract<ConsumerFetchEndpoints[P][number], { method: M }>["response"];

export type AvailableMutateMethods<P extends MutatePath> =
  | MutateMethodsFor<P, "POST">
  | MutateMethodsFor<P, "PUT">
  | MutateMethodsFor<P, "DELETE">
  | MutateMethodsFor<P, "PATCH">;

export type EndpointsByMethod<
  TPath extends FetchPath | MutatePath,
  TMethod extends HttpMethod,
> = TMethod extends "GET"
  ? Extract<ConsumerFetchEndpoints[TPath][number], { method: "GET" }>
  : Extract<ConsumerMutateEndpoints[TPath][number], { method: TMethod }>;

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
