# Apity

A type-safe API client generator for React applications with runtime validation.

## Features

- 🔒 Type-safe API endpoints with TypeScript
- 📄 Define your API schema with Zod
- 🔄 Static type generation for path and query parameters
- 🎯 Runtime validation with Zod
- ⚡️ React Query integration
- 🔄 Import from OpenAPI/Swagger specifications

## Installation

```bash
npm install @danstackme/apity
```

## Quick Start

1. Define your API endpoints:

```typescript
// src/endpoints.ts
import { createApi, createApiEndpoint } from "@danstackme/apity";
import { z } from "zod";

// Define your Zod schemas
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const UsersResponseSchema = z.array(UserSchema);

const CreateUserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

const QuerySchema = z.object({
  limit: z.number(),
  offset: z.number().optional(),
});

// Define your endpoints
const getUsersEndpoint = createApiEndpoint({
  method: "GET",
  response: UsersResponseSchema,
  query: QuerySchema,
});

const createUserEndpoint = createApiEndpoint({
  method: "POST",
  response: UserSchema,
  body: CreateUserSchema,
});

const getUserEndpoint = createApiEndpoint({
  method: "GET",
  response: UserSchema,
});

const updateUserEndpoint = createApiEndpoint({
  method: "PUT",
  response: UserSchema,
  body: CreateUserSchema,
});

const deleteUserEndpoint = createApiEndpoint({
  method: "DELETE",
  response: z.void(),
});

// Export your endpoints
export const fetchEndpoints = {
  "/users": [getUsersEndpoint],
  "/users/[id]": [getUserEndpoint],
} as const;

export const mutateEndpoints = {
  "/users": [createUserEndpoint],
  "/users/[id]": [updateUserEndpoint, deleteUserEndpoint],
} as const;

// Create and export the API instance
export const api = createApi({
  baseUrl: "https://api.example.com",
  fetchEndpoints,
  mutateEndpoints,
});
```

2. Set up the type definitions in your application (typically in App.tsx):

```typescript
// src/App.tsx
import { ApiProvider } from "@danstackme/apity";
import { api, fetchEndpoints, mutateEndpoints } from "./endpoints";

// Register your endpoints for type safety
declare module "@danstackme/apity" {
  interface Register {
    fetchEndpoints: typeof fetchEndpoints;
    mutateEndpoints: typeof mutateEndpoints;
  }
}

function App() {
  return (
    <ApiProvider api={api}>
      <YourApp />
    </ApiProvider>
  );
}
```

3. Use the hooks in your components:

```typescript
// src/components/UserList.tsx
import { useFetch, useMutate } from "@danstackme/apity";

export function UserList() {
  // Fetch users with required query parameters
  const { data: users, isLoading } = useFetch({
    path: "/users",
    query: {
      limit: 10,
      offset: 0,
    },
  });

  // Set up a mutation with path parameters
  const { mutate: createUser, isPending: isCreating } = useMutate({
    path: "/users/[id]",
    method: "PUT",
    body: {
      name: "",
      email: "",
    },
    params: { id: 1 },
  });

  // Another mutation example
  const { mutate: deleteUser } = useMutate({
    path: "/users/[id]",
    method: "DELETE",
    params: { id: 1 },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Users</h1>

      {/* Create user form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          createUser({
            name: formData.get("name") as string,
            email: formData.get("email") as string,
          });
        }}
      >
        <input type="text" name="name" placeholder="Name" required />
        <input type="email" name="email" placeholder="Email" required />
        <button type="submit" disabled={isCreating}>
          {isCreating ? "Creating..." : "Create User"}
        </button>
      </form>

      {/* User list */}
      <div>
        {users?.map((user) => (
          <div key={user.id}>
            <h3>{user.name}</h3>
            <p>{user.email}</p>
            <button onClick={() => deleteUser({ params: { id: user.id } })}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Advanced Usage

### Adding Middleware

You can add middleware for authentication, error handling, and more:

```typescript
export const api = createApi({
  baseUrl: "https://api.example.com",
  fetchEndpoints,
  mutateEndpoints,
  middleware: {
    before: (config) => {
      // Add authentication header
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      };
      return config;
    },
    onError: (error) => {
      // Handle unauthorized errors
      if (error.response?.status === 401) {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    },
  },
});
```

### Path Parameters

For dynamic routes, use square brackets in the path and provide params:

```typescript
const { data: user } = useFetch({
  path: "/users/[id]",
  params: { id: "123" },
});
```

## OpenAPI/Swagger Import

You can automatically generate type-safe endpoints from your OpenAPI/Swagger specification using the built-in CLI tool:

```bash
npx @danstackme/apity import-openapi <path-to-spec> --outDir <out-directory>
```

The --outDir defaults to `/src`

The tool supports both JSON and YAML specifications and will:

- Automatically convert Swagger 2.0 to OpenAPI 3.0
- Generate type-safe endpoints with Zod validation
- Create path and query parameter types
- Set up proper request/response validation

For example, given an OpenAPI spec like:

```yaml
openapi: 3.0.0
paths:
  /users:
    get:
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
      responses:
        200:
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/User"
    post:
      requestBody:
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateUser"
      responses:
        200:
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/User"
```

It will generate a fully typed `endpoints.ts` file with proper Zod validation schemas that you can immediately use in your application.

## License

MIT
