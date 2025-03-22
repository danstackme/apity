import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { useApiContext } from "./context";
import type {
  ConsumerFetchEndpoints,
  ExtractPathParams,
  Method,
  Path,
} from "./types";

import { getParamName, interpolatePath } from "./utils";

export function useMutate<
  TPath extends Path,
  TMethod extends Exclude<Method<TPath>, "GET">,
>(
  path: TPath,
  options: Omit<
    UseMutationOptions<
      ConsumerFetchEndpoints[TPath][TMethod]["response"],
      Error,
      ConsumerFetchEndpoints[TPath][TMethod] extends { body: any }
        ? ConsumerFetchEndpoints[TPath][TMethod]["body"]
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
    mutationFn: async (
      data: ConsumerFetchEndpoints[TPath][TMethod]["body"]
    ) => {
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
