# DanStack API

A type-safe API client for React applications, built with TypeScript and React Query.

## Features

- 🔒 Type-safe API calls with full TypeScript support
- 🎯 File-based API endpoint definitions
- 🔄 Automatic request caching and invalidation with React Query
- 🛠️ Middleware support for request/response transformation
- 📦 Zero dependencies (except React Query and Axios)

## Installation

```bash
npm install @danstackme/apity
```

## Quick Start

1. Define your API endpoints using either file-based routing or a single file:

### Option 1: File-based Routing

Create your API endpoints in the `endpoints` directory:

```typescript
// endpoints/users/index.ts
import { z } from "zod";

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

// Define multiple methods in a single file
export const GET = {
  method: "GET",
  responseSchema: z.array(UserSchema),
  querySchema: z.object({
    filter: z.string().optional(),
  }),
};

export const POST = {
  method: "POST",
  responseSchema: UserSchema,
  bodySchema: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
};
```

```typescript
// endpoints/users/[id].ts
import { z } from "zod";

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

// Define multiple methods for a single user endpoint
export const GET = {
  method: "GET",
  responseSchema: UserSchema,
  params: { id: z.string() },
};

export const PUT = {
  method: "PUT",
  responseSchema: UserSchema,
  bodySchema: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
  }),
  params: { id: z.string() },
};

export const DELETE = {
  method: "DELETE",
  responseSchema: z.void(),
  params: { id: z.string() },
};
```

```typescript
// endpoints/users/[id]/posts.ts
import { z } from "zod";

const PostSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
});

export const GET = {
  method: "GET",
  responseSchema: z.array(PostSchema),
  params: { id: z.string() },
};

export const POST = {
  method: "POST",
  responseSchema: PostSchema,
  bodySchema: z.object({
    title: z.string(),
    content: z.string(),
  }),
  params: { id: z.string() },
};
```

### Option 2: Single File Definition

```typescript
// src/api.ts
import { z } from "zod";
import { createApi } from "@danstackme/apity";

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const PostSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
});

const api = createApi({
  baseUrl: "https://api.example.com",
  apiTree: {
    "/users": {
      GET: {
        method: "GET",
        responseSchema: z.array(UserSchema),
        querySchema: z.object({
          filter: z.string().optional(),
        }),
      },
      POST: {
        method: "POST",
        responseSchema: UserSchema,
        bodySchema: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
      },
    },
    "/users/[id]": {
      GET: {
        method: "GET",
        responseSchema: UserSchema,
        params: { id: z.string() },
      },
      PUT: {
        method: "PUT",
        responseSchema: UserSchema,
        bodySchema: z.object({
          name: z.string().optional(),
          email: z.string().email().optional(),
        }),
        params: { id: z.string() },
      },
    },
    "/users/[id]/posts": {
      GET: {
        method: "GET",
        responseSchema: z.array(PostSchema),
        params: { id: z.string() },
      },
    },
  },
});

export default api;
```

2. Set up the API provider and type augmentation in your app:

```typescript
// src/types.ts
import type { Register } from "@danstackme/apity";
import type { ApiTree } from "./generated/apiTree.gen"; // For file-based routing
// OR
import type { ApiTree } from "./api"; // For single file definition

declare module "@danstackme/apity" {
  interface Register {
    apiTree: ApiTree;
  }
}

// src/App.tsx
import { ApiProvider } from "@danstackme/apity";
import api from "./api"; // For single file definition
// OR
import { createApi } from "@danstackme/apity";
import type { ApiTree } from "./generated/apiTree.gen"; // For file-based routing

// For file-based routing
const api = createApi({
  baseUrl: "https://api.example.com",
  apiTree: {} as ApiTree, // This will be populated by the generated code
});

function App() {
  return (
    <ApiProvider
      baseURL="https://api.example.com"
      client={api.client}
      queryClient={api.queryClient}
    >
      <YourApp />
    </ApiProvider>
  );
}
```

3. Use the hooks in your components:

```typescript
import { useFetch, useMutate } from "@danstackme/apity";

function UserList() {
  // Fetch users with query parameters
  const { data: users, isLoading } = useFetch("/users", {
    query: { filter: "active" },
  });

  // Fetch a single user with path parameters
  const { data: user } = useFetch("/users/[id]", {
    params: { id: "123" },
  });

  // Fetch user's posts with nested path parameters
  const { data: posts } = useFetch("/users/[id]/posts", {
    params: { id: "123" },
  });

  // Create a new user
  const { mutate: createUser } = useMutate("/users", {
    method: "POST",
  });

  // Update a user
  const { mutate: updateUser } = useMutate("/users/[id]", {
    method: "PUT",
    params: { id: "123" },
  });

  // Delete a user
  const { mutate: deleteUser } = useMutate("/users/[id]", {
    method: "DELETE",
    params: { id: "123" },
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {users?.map((user) => (
        <div key={user.id}>
          {user.name}
          <button onClick={() => deleteUser()}>Delete</button>
        </div>
      ))}
      <button
        onClick={() =>
          createUser({ name: "New User", email: "new@example.com" })
        }
      >
        Add User
      </button>
      <button
        onClick={() =>
          updateUser({ name: "Updated Name", email: "updated@example.com" })
        }
      >
        Update User
      </button>
    </div>
  );
}
```

## API Reference

### `createApi`

Creates a new API instance with your configuration.

```typescript
function createApi(config: {
  // The base URL for all API requests
  baseUrl: string;
  // Optional headers to include in all requests
  headers?: Record<string, string>;
  // Optional custom Axios instance
  client?: AxiosInstance;
  // Optional custom React Query client
  queryClient?: QueryClient;
  // Your API endpoint definitions
  apiTree: {
    [path: string]: {
      [method: string]: {
        method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
        responseSchema?: z.ZodType; // Response data validation
        bodySchema?: z.ZodType; // Request body validation
        querySchema?: z.ZodType; // Query parameters validation
        params?: Record<string, z.ZodType>; // Path parameters validation
      };
    };
  };
});
```

### `useFetch`

A hook for making GET requests to your API endpoints. This hook extends React Query's `useQuery` hook, so you get all its features and return values.

```typescript
function useFetch(
  // The API endpoint path (e.g., "/users" or "/users/[id]")
  path: string,
  options?: {
    // Path parameters for dynamic routes (e.g., { id: "123" } for "/users/[id]")
    params?: Record<string, string>;
    // Query parameters to append to the URL (e.g., { filter: "active" })
    query?: Record<string, any>;
    // All React Query options are supported
    enabled?: boolean;
    staleTime?: number;
    cacheTime?: number;
    refetchOnMount?: boolean;
    refetchOnWindowFocus?: boolean;
    refetchOnReconnect?: boolean;
    retry?: number | boolean;
    retryDelay?: number | ((attemptIndex: number) => number);
    onSuccess?: (data: any) => void;
    onError?: (error: Error) => void;
    onSettled?: (data: any, error: Error | null) => void;
    // ... and all other React Query options
  }
): {
  // All React Query return values are available
  data: any;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: Error | null;
  isStale: boolean;
  isPaused: boolean;
  isPlaceholderData: boolean;
  isPreviousData: boolean;
  isRefetchError: boolean;
  isRefetching: boolean;
  isStale: boolean;
  isPaused: boolean;
  isPlaceholderData: boolean;
  isPreviousData: boolean;
  isRefetchError: boolean;
  isRefetching: boolean;
  refetch: () => Promise<any>;
  remove: () => void;
  // ... and all other React Query return values
};
```

### `useMutate`

A hook for making POST, PUT, PATCH, or DELETE requests to your API endpoints. This hook extends React Query's `useMutation` hook, so you get all its features and return values.

```typescript
function useMutate(
  // The API endpoint path (e.g., "/users" or "/users/[id]")
  path: string,
  options: {
    // The HTTP method to use (POST, PUT, PATCH, or DELETE)
    method: "POST" | "PUT" | "PATCH" | "DELETE";
    // Path parameters for dynamic routes (e.g., { id: "123" } for "/users/[id]")
    params?: Record<string, string>;
    // All React Query mutation options are supported
    onSuccess?: (data: any, variables: any, context: any) => void;
    onError?: (error: Error, variables: any, context: any) => void;
    onSettled?: (
      data: any,
      error: Error | null,
      variables: any,
      context: any
    ) => void;
    onMutate?: (variables: any) => Promise<any> | void;
    retry?: number | boolean;
    retryDelay?: number | ((attemptIndex: number) => number);
    // ... and all other React Query mutation options
  }
): {
  // All React Query mutation return values are available
  mutate: (variables: any) => void;
  mutateAsync: (variables: any) => Promise<any>;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: Error | null;
  isIdle: boolean;
  isPaused: boolean;
  isPending: boolean;
  reset: () => void;
  // ... and all other React Query mutation return values
};
```

## File-based Routing

API endpoints are defined using a file-based routing system in the `endpoints` directory. The file structure determines the API paths:

```
endpoints/
  users/
    [id].ts        # /users/[id] (GET, PUT, DELETE)
    index.ts       # /users (GET, POST)
  posts/
    [id]/
      comments.ts  # /posts/[id]/comments (GET, POST)
    index.ts       # /posts (GET, POST)
```

Each endpoint file can export multiple HTTP methods:

```typescript
export const GET = {
  method: "GET",
  responseSchema: z.ZodType, // Response validation
  querySchema: z.ZodType, // Query parameters validation
  params: Record<string, z.ZodType>, // Path parameters validation
};

export const POST = {
  method: "POST",
  responseSchema: z.ZodType,
  bodySchema: z.ZodType, // Request body validation
  params: Record<string, z.ZodType>,
};

// ... other HTTP methods (PUT, PATCH, DELETE)
```

## License

MIT
