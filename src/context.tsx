import { AxiosInstance } from "axios";
import { createContext, useContext } from "react";
import type { Register } from "./types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";

export type ApiTree = Register["apiTree"];

interface ApiContextValue {
  client: AxiosInstance;
  queryClient: QueryClient;
  baseURL: string;
  config: {
    baseUrl: string;
  };
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
  baseURL: string;
  client?: AxiosInstance;
  queryClient?: QueryClient;
}

export function ApiProvider({
  children,
  baseURL,
  client = axios,
  queryClient = new QueryClient(),
}: ApiProviderProps) {
  const value: ApiContextValue = {
    client,
    queryClient,
    baseURL,
    config: {
      baseUrl: baseURL,
    },
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ApiContext.Provider value={value}>{children}</ApiContext.Provider>
    </QueryClientProvider>
  );
}
