# APity

Type-safe API client generator for React applications with file-based routing and runtime validation.

[![npm version](https://img.shields.io/npm/v/@danstack/apity.svg)](https://www.npmjs.com/package/@danstack/apity)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.0+-blue.svg)](https://reactjs.org/)

APity generates fully type-safe API clients with:

- File-based routing for API endpoints
- Runtime validation using Zod
- React Query integration out of the box
- Type inference for responses, request bodies, and query parameters
- Path parameter validation
- Support for OpenAPI/Swagger specifications (coming soon)

## Installation

```bash
npm install @danstack/apity @tanstack/react-query axios zod
```

## Setup

### File-Based Routing

1. Create a `routes` directory in your project:

```
src/
  routes/
    users/
      [id]/
        index.ts      # GET /users/:id
        posts.ts      # GET /users/:id/posts
      index.ts        # GET /users
```

2. Define your endpoints using the `createApiEndpoint` function:

```typescript
// src/routes/users/index.ts
import { z } from "zod";
import { createApiEndpoint } from "@danstack/apity";

export const GET = createApiEndpoint({
  response: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    })
  ),
});

export const POST = createApiEndpoint({
  body: z.object({
    name: z.string(),
  }),
  response: z.object({
    id: z.string(),
    name: z.string(),
  }),
});
```

```typescript
// src/routes/users/[id]/index.ts
import { z } from "zod";
import { createApiEndpoint } from "@danstack/apity";

export const GET = createApiEndpoint({
  response: z.object({
    id: z.string(),
    name: z.string(),
  }),
  query: z.object({
    include: z.array(z.string()).optional(),
  }),
});

export const PUT = createApiEndpoint({
  body: z.object({
    name: z.string(),
  }),
  response: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

export const DELETE = createApiEndpoint({
  response: z.void(),
});
```

3. Initialize your API client:

```typescript
// src/api.ts
import { createApi } from "@danstack/apity";
import type { ApiTree } from "./generated/apiTree.gen";

export const api = createApi<ApiTree>({
  baseURL: "https://api.example.com",
});
```

4. Use in your components:

```typescript
import { useFetch, useMutate } from "@danstack/apity";

function UserList() {
  // Fetch users with type-safe response
  const { data: users } = useFetch("/users");

  // Create user with type-safe request body
  const { mutate: createUser } = useMutate("/users", {
    method: "POST",
  });

  // Fetch single user with path params and query params
  const { data: user } = useFetch("/users/[id]", {
    params: { id: "123" },
    query: { include: ["posts"] },
  });

  // Update user with path params and body
  const { mutate: updateUser } = useMutate("/users/[id]", {
    method: "PUT",
    params: { id: "123" },
  });

  // Delete user with path params
  const { mutate: deleteUser } = useMutate("/users/[id]", {
    method: "DELETE",
    params: { id: "123" },
  });

  return (
    <div>
      {users?.map((user) => (
        <div key={user.id}>{user.name}</div>
      ))}
      <button onClick={() => createUser({ name: "New User" })}>Add User</button>
    </div>
  );
}
```

### Inline API Definition

You can also define your API inline without file-based routing:

```typescript
import { z } from "zod";
import { createApi } from "@danstack/apity";

const api = createApi({
  baseURL: "https://api.example.com",
  endpoints: {
    "/users": {
      GET: createApiEndpoint({
        response: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
          })
        ),
      }),
      POST: createApiEndpoint({
        body: z.object({
          name: z.string(),
        }),
        response: z.object({
          id: z.string(),
          name: z.string(),
        }),
      }),
    },
    "/users/[id]": {
      GET: createApiEndpoint({
        response: z.object({
          id: z.string(),
          name: z.string(),
        }),
        query: z.object({
          include: z.array(z.string()).optional(),
        }),
      }),
    },
  },
});
```

## Features

### Path Parameters

Path parameters are automatically typed based on the route path:

```typescript
// Fully typed path parameters
const { data } = useFetch("/users/[id]", {
  params: { id: "123" },
});
```

### Query Parameters

Query parameters are validated at runtime and typed:

```typescript
// Typed and validated query parameters
const { data } = useFetch("/users/[id]", {
  params: { id: "123" },
  query: { include: ["posts"] },
});
```

### Request Body Validation

Request bodies are validated at runtime using Zod:

```typescript
// Validated request body
const { mutate } = useMutate("/users", {
  method: "POST",
});

mutate({ name: "John" }); // Body is type-checked and validated
```

### Response Type Safety

All responses are fully typed and validated:

```typescript
const { data } = useFetch("/users/[id]", {
  params: { id: "123" },
});
// data is typed as { id: string; name: string }
```

## Configuration

### Custom Axios Instance

You can provide your own Axios instance with custom configuration:

```typescript
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "https://api.example.com",
  headers: {
    Authorization: "Bearer token",
  },
});

const api = createApi<ApiTree>({
  axios: axiosInstance,
});
```

### Error Handling

APity provides type-safe error handling with React Query's error handling:

```typescript
const { data, error } = useFetch("/users/[id]", {
  params: { id: "123" },
});

if (error) {
  // error is typed with your API error structure
  console.error(error.response?.data);
}
```

## Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) for details.

## License

MIT © [danstack](https://github.com/danstack)
