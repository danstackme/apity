import { createContext, useContext, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import type { ApiTree } from "./generated/apiTree.gen";

interface ApiContextValue {
  baseURL: string;
  client: typeof axios;
  queryClient: QueryClient;
  apiTree: ApiTree;
}

const ApiContext = createContext<ApiContextValue | null>(null);

interface ApiProviderProps {
  children: ReactNode;
  baseURL: string;
  client?: typeof axios;
  queryClient?: QueryClient;
}

export function ApiProvider({
  children,
  baseURL,
  client = axios,
  queryClient = new QueryClient(),
}: ApiProviderProps) {
  const value: ApiContextValue = {
    baseURL,
    client,
    queryClient,
    apiTree: {} as ApiTree, // This will be populated by the generated code
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ApiContext.Provider value={value}>{children}</ApiContext.Provider>
    </QueryClientProvider>
  );
}

export function useApiContext() {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error("useApiContext must be used within an ApiProvider");
  }
  return context;
}
