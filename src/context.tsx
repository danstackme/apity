import { QueryClientProvider } from "@tanstack/react-query";
import { AxiosInstance } from "axios";
import { createContext, useContext } from "react";
import type { ApiContext as ApiContextType } from "./types";

interface ApiContextValue {
  client: AxiosInstance;
  queryClient: ApiContextType["queryClient"];
  config: ApiContextType["config"];
}

const ApiContext = createContext<ApiContextValue | null>(null);

export function useApiContext(): ApiContextValue {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error("useApiContext must be used within an ApiProvider");
  }
  return context;
}

interface ApiProviderProps {
  children: React.ReactNode;
  api: ApiContextType;
}

export function ApiProvider({ children, api }: ApiProviderProps) {
  const value: ApiContextValue = {
    client: api.client,
    queryClient: api.queryClient,
    config: api.config,
  };

  return (
    <QueryClientProvider client={api.queryClient}>
      <ApiContext.Provider value={value}>{children}</ApiContext.Provider>
    </QueryClientProvider>
  );
}
