import {
  useMutation,
  useQuery,
  UseMutationOptions,
  UseQueryOptions,
} from "@tanstack/react-query";
import { useApiContext } from "./context";
import type { ExtractPathParams, Endpoints } from "./types";

type Path = keyof Endpoints & string;
type Method<P extends Path> = keyof Endpoints[P] & string;

export function useFetch<
  TPath extends Path,
  TMethod extends Extract<Method<TPath>, "GET">,
>(
  path: TPath,
  options: Omit<
    UseQueryOptions<
      Endpoints[TPath][TMethod]["response"],
      Error,
      Endpoints[TPath][TMethod]["response"],
      [
        string,
        ExtractPathParams<TPath> | undefined,
        Endpoints[TPath][TMethod]["query"] | undefined,
      ]
    >,
    "queryKey" | "queryFn"
  > & {
    params?: ExtractPathParams<TPath>;
    query?: Endpoints[TPath][TMethod]["query"];
  } = {}
) {
  const { params, query, enabled = true, ...queryOptions } = options;
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
