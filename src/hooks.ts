import { useMutation, useQuery } from "@tanstack/react-query";
import { useApiContext } from "./context";
import type {
  ApiEndpoint,
  ExtractRouteParams,
  HttpMethod,
  Register,
} from "./types";

type ApiTree = Register["router"]["apiTree"];
type PathOf<T> = keyof T & string;

type UseFetchOptions<
  TPath extends PathOf<ApiTree>,
  TEndpoint extends ApiEndpoint<any, any, any, any>
> = {
  params?: ExtractRouteParams<TPath>;
  query?: TEndpoint extends ApiEndpoint<any, any, infer Query, any>
    ? Query
    : never;
  enabled?: boolean;
};

type UseMutateOptions<
  TPath extends PathOf<ApiTree>,
  TMethod extends HttpMethod
> = {
  method: TMethod;
  params?: ExtractRouteParams<TPath>;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
};

export function useFetch<
  TPath extends PathOf<ApiTree>,
  TEndpoint extends ApiEndpoint<any, any, any, any>
>(path: TPath, options: UseFetchOptions<TPath, TEndpoint> = {}) {
  const { params, query, enabled = true } = options;
  const { client, baseURL } = useApiContext();
  const url = interpolatePath(path, params || {});

  return useQuery({
    queryKey: [path, params, query],
    queryFn: async () => {
      const response = await client.get(url, {
        baseURL,
        params: query,
      });
      return response.data;
    },
    enabled,
  });
}

export function useMutate<
  TPath extends PathOf<ApiTree>,
  TMethod extends Exclude<HttpMethod, "GET">
>(path: TPath, options: UseMutateOptions<TPath, TMethod>) {
  const { method, params, onSuccess, onError } = options;
  const { client, baseURL } = useApiContext();
  const url = interpolatePath(path, params || {});

  return useMutation({
    mutationFn: async (body: any) => {
      const response = await client.request({
        method: method?.toLowerCase() || "post",
        url,
        baseURL,
        data: body,
      });
      return response.data;
    },
    onSuccess,
    onError,
  });
}

function interpolatePath(
  path: string,
  params: Record<string, string | undefined>
): string {
  if (!path || typeof path !== "string" || !path.includes("[")) {
    return path;
  }

  console.log(path, params);

  return path.replace(/\[([^\]]+)\]/g, (_, param) => {
    if (!params || !(param in params) || params[param] === undefined) {
      throw new Error(`Missing path parameter: ${param}`);
    }
    return params[param] as string;
  });
}
