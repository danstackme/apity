import {
  useMutation,
  useQuery,
  UseMutationOptions,
  UseQueryOptions,
} from "@tanstack/react-query";
import { useApiContext } from "./context";
import type {
  ExtractPathParams,
  Endpoints,
  ApiEndpoint,
  HttpMethod,
} from "./types";

type Path = keyof Endpoints & string;
type Method<P extends Path> = keyof Endpoints[P] & string;

type EndpointByMethod<TPath extends Path, TMethod extends HttpMethod> = Extract<
  Endpoints[TPath][number],
  ApiEndpoint<TMethod, any, any, any>
>;

type HasRequiredProperties<T> = T extends object
  ? keyof {
      [K in keyof T as T[K] extends undefined ? never : K]: K;
    } extends never
    ? false
    : true
  : false;

type HasPathParams<T extends string> = T extends `${string}[${string}]${string}`
  ? true
  : false;

type OptionalQueryParams<TPath extends Path> = {
  query?: EndpointByMethod<TPath, "GET">["query"];
};

type RequiredQueryParams<TPath extends Path> = {
  query: EndpointByMethod<TPath, "GET">["query"];
};

export function useFetch<TPath extends Path>(
  path: TPath,
  options?: Omit<
    UseQueryOptions<
      EndpointByMethod<TPath, "GET">["response"],
      Error,
      EndpointByMethod<TPath, "GET">["response"],
      any
    >,
    "queryKey" | "queryFn"
  > & {
    params: HasPathParams<TPath> extends true
      ? ExtractPathParams<TPath>
      : never;
  } & (HasRequiredProperties<
      EndpointByMethod<TPath, "GET">["query"]
    > extends true
      ? RequiredQueryParams<TPath>
      : OptionalQueryParams<TPath>)
) {
  const { params, query, enabled = true, ...queryOptions } = options || {};
  const { client, config } = useApiContext();

  if (path.includes("[") && (!params || Object.keys(params).length === 0)) {
    throw new Error(`Missing path parameter: ${getParamName(path)}`);
  }

  const url = interpolatePath(path, params || {});

  return useQuery({
    ...queryOptions,
    queryKey: [path, params, query],
    queryFn: async () => {
      const response = await client.get(url, {
        baseURL: config.baseUrl,
        params: query,
      });
      return response.data;
    },
    enabled,
  });
}

export function useMutate<
  TPath extends Path,
  TMethod extends Exclude<Method<TPath>, "GET">,
>(
  path: TPath,
  options: Omit<
    UseMutationOptions<
      Endpoints[TPath][TMethod]["response"],
      Error,
      Endpoints[TPath][TMethod] extends { body: any }
        ? Endpoints[TPath][TMethod]["body"]
        : undefined
    >,
    "mutationFn"
  > & {
    params?: ExtractPathParams<TPath>;
    method?: "post" | "put" | "patch" | "delete";
  } = {}
) {
  const { params, method = "post", ...mutationOptions } = options;
  const { client, config } = useApiContext();

  if (path.includes("[") && (!params || Object.keys(params).length === 0)) {
    throw new Error(`Missing path parameter: ${getParamName(path)}`);
  }

  const url = interpolatePath(path, params || {});

  return useMutation({
    ...mutationOptions,
    mutationFn: async (data: Endpoints[TPath][TMethod]["body"]) => {
      const response = await client.request({
        method,
        url,
        baseURL: config.baseUrl,
        data,
      });
      return response.data;
    },
  });
}

function getParamName(path: string): string {
  const match = path.match(/\[([^\]]+)\]/);
  return match ? match[1] : "";
}

function interpolatePath(path: string, params: Record<string, string>): string {
  return path.replace(/\[([^\]]+)\]/g, (_, key) => {
    if (!params[key]) {
      throw new Error(`Missing path parameter: ${key}`);
    }
    return params[key];
  });
}
