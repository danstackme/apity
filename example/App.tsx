import React from "react";
import { ApiProvider } from "type-safe-api";
import { api } from "./api";

export function App() {
  return (
    <ApiProvider
      router={api}
      middlewares={[
        // Optional global middlewares
        async (config) => {
          // Add auth header
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${getToken()}`,
          };
          return config;
        },
      ]}
      onError={(error) => {
        // Global error handling
        console.error("API Error:", error);
      }}
    >
      {/* Your app components */}
      <UserComponent id="123" />
    </ApiProvider>
  );
}
