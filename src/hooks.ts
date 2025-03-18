import {
  useMutation,
  useQuery,
  UseMutationOptions,
  UseQueryOptions,
} from "@tanstack/react-query";
import { useApiContext } from "./context";
import type {
  ApiEndpoint,
  ExtractRouteParams,
  HttpMethod,
  Register,
} from "./types";

type ApiTree = Register["apiTree"];

export function useFetch<
  TPath extends keyof ApiTree & string,
  TEndpoint extends ApiTree[TPath][HttpMethod],
>(
  path: TPath,
  options: Omit<
    UseQueryOptions<
      TEndpoint extends ApiEndpoint<infer Response, any, any, any>
        ? Response
        : unknown,
      Error,
      TEndpoint extends ApiEndpoint<infer Response, any, any, any>
        ? Response
        : unknown,
      [string, ExtractRouteParams<TPath> | undefined, any]
    >,
    "queryKey" | "queryFn"
  > & {
    params?: ExtractRouteParams<TPath>;
    query?: TEndpoint extends ApiEndpoint<any, any, infer Query, any>
      ? Query
      : undefined;
  } = {}
) {
  const { params, query, enabled = true, ...queryOptions } = options;
  const { client, config } = useApiContext();
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
  TPath extends keyof ApiTree & string,
  TMethod extends Exclude<HttpMethod, "GET">,
>(
  path: TPath,
  options: Omit<UseMutationOptions<any, Error, any, unknown>, "mutationFn"> & {
    method: TMethod;
    params?: ExtractRouteParams<TPath>;
  }
) {
  const { method, params, ...mutationOptions } = options;
  const { client, config } = useApiContext();
  const url = interpolatePath(path, params || {});

  return useMutation({
    ...mutationOptions,
    mutationFn: async (body: any) => {
      const response = await client.request({
        method: method?.toLowerCase() || "post",
        url,
        baseURL: config.baseUrl,
        data: body,
      });
      return response.data;
    },
  });
}

function interpolatePath(
  path: string,
  params: Record<string, string | undefined>
): string {
  if (!path || typeof path !== "string" || !path.includes("[")) {
    return path;
  }

  return path.replace(/\[([^\]]+)\]/g, (_, param) => {
    if (!params || !(param in params) || params[param] === undefined) {
      throw new Error(`Missing path parameter: ${param}`);
    }
    return params[param] as string;
  });
}
