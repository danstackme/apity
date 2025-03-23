import { useMutation } from "@tanstack/react-query";
import { useApiContext } from "./context";
import type {
  AvailableMutateMethods,
  MutateBodyFor,
  MutatePath,
  MutateResponseFor,
  UseMutateOptionsType,
} from "./types";

import { getParamName, interpolatePath } from "./utils";

export function useMutate<
  TPath extends MutatePath,
  TMethod extends AvailableMutateMethods<TPath>,
>(options: UseMutateOptionsType<TPath, TMethod>) {
  const { path, params, method, ...mutationOptions } = options;
  const { client, config } = useApiContext();

  if (path.includes("[") && (!params || Object.keys(params).length === 0)) {
    throw new Error(`Missing path parameter: ${getParamName(path)}`);
  }

  const url = interpolatePath(path, params || {});

  return useMutation({
    ...mutationOptions,
    mutationFn: async (
      data: MutateBodyFor<TPath, TMethod>
    ): Promise<MutateResponseFor<TPath, TMethod>> => {
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
