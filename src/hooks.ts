import {
  useMutation,
  useQuery,
  UseMutationOptions,
  UseQueryOptions,
} from "@tanstack/react-query";
import { useApiContext } from "./context";
import type { ExtractPathParams, ApiTree } from "./types";

type Path = keyof ApiTree & string;
type Method<P extends Path> = keyof ApiTree[P] & string;

export function useFetch<
  TPath extends Path,
  TMethod extends Extract<Method<TPath>, "GET">,
>(
  path: TPath,
  options: Omit<
    UseQueryOptions<
      ApiTree[TPath][TMethod]["response"],
      Error,
      ApiTree[TPath][TMethod]["response"],
      [
        string,
        ExtractPathParams<TPath> | undefined,
        ApiTree[TPath][TMethod]["query"] | undefined,
      ]
    >,
    "queryKey" | "queryFn"
  > & {
    params?: ExtractPathParams<TPath>;
    query?: ApiTree[TPath][TMethod]["query"];
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
      ApiTree[TPath][TMethod]["response"],
      Error,
      ApiTree[TPath][TMethod] extends { body: any }
        ? ApiTree[TPath][TMethod]["body"]
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
    mutationFn: async (data: ApiTree[TPath][TMethod]["body"]) => {
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
