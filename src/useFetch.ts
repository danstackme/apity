import { useQuery } from "@tanstack/react-query";
import { useApiContext } from "./context";
import { UseFetchOptionsType, Path } from "./types";

import { getParamName, interpolatePath } from "./utils";

export function useFetch<TPath extends Path>(
  options: UseFetchOptionsType<TPath>
) {
  const { path, params, query, enabled = true, ...queryOptions } = options;
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
