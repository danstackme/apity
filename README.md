# APity

Type-safe API client generator for React applications with file-based routing and runtime validation.

[![npm version](https://img.shields.io/npm/v/@danstackme/apity.svg)](https://www.npmjs.com/package/@danstackme/apity)
[![CI](https://github.com/danstack/apity/actions/workflows/ci.yml/badge.svg)](https://github.com/danstack/apity/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/danstack/apity/branch/main/graph/badge.svg)](https://codecov.io/gh/danstack/apity)
[![npm downloads](https://img.shields.io/npm/dm/@danstackme/apity.svg)](https://www.npmjs.com/package/@danstackme/apity)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.0+-blue.svg)](https://reactjs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

APity generates fully type-safe API clients with:

- File-based routing for API endpoints
- Runtime validation using Zod
- React Query integration out of the box
- Type inference for responses, request bodies, and query parameters
- Path parameter validation
- Support for OpenAPI/Swagger specifications (coming soon)

## Features

- 🗂️ File-based routing or single-file API definition
- 🔒 Type-safe API calls with TypeScript
- ✨ Runtime validation with Zod
- 🔄 Built-in React Query integration
- 📚 OpenAPI/Swagger import support

## Installation

```bash
npm install @danstackme/apity @tanstack/react-query axios zod
```

## Quick Start

### Option 1: Import from OpenAPI/Swagger

If you have an existing OpenAPI/Swagger specification, you can quickly generate your API client:

```bash
# Install the package
npm install @danstackme/apity

# Generate API client from OpenAPI spec
npx apity-import swagger.yaml

# Or for a single-file output instead of file-based routing
npx apity-import swagger.yaml --output single-file
```

The importer supports both YAML and JSON formats, and can handle both OpenAPI 3.x and Swagger 2.0 specifications.

#### File-Based Output

When using `--output file-based` (default), the importer will:

1. Create a `src/routes` directory (customizable with `--outDir`)
2. Generate separate files for each API endpoint
3. Convert path parameters from `{param}` to `[param]` format

Example output structure:

```
src/routes/
  ├── pets.ts              # /pets endpoints
  └── pets._id_.ts         # /pets/{id} endpoints
```

#### Single-File Output

When using `--output single-file`, the importer will:

1. Create a `src/generated-api.ts` file (customizable with `--outDir`)
2. Generate a single API tree with all endpoints

Example usage after generation:

```typescript
// With file-based routing
import { GET, POST } from "./routes/pets";
import { GET as getById, PUT } from "./routes/pets._id_";

// With single-file
import { api } from "./generated-api";

// Setup your API provider
import { ApiProvider } from "@danstackme/apity";

function App() {
  return (
    <ApiProvider baseURL="https://api.example.com">
      {/* Your app */}
    </ApiProvider>
  );
}

// Use the generated hooks
function PetsList() {
  // File-based routing
  const { data } = useFetch("/pets", {
    endpoint: GET,
  });

  // Or with single-file
  const { data } = useFetch("/pets", {
    endpoint: api.apiTree["/pets"].GET,
  });

  return (
    <ul>
      {data?.pets.map((pet) => (
        <li key={pet.id}>{pet.name}</li>
      ))}
    </ul>
  );
}

function CreatePet() {
  // File-based routing
  const { mutate } = useMutate("/pets", {
    method: "POST",
    endpoint: POST,
  });

  // Or with single-file
  const { mutate } = useMutate("/pets", {
    method: "POST",
    endpoint: api.apiTree["/pets"].POST,
  });

  const handleSubmit = (data: { name: string; type: string }) => {
    mutate(data);
  };

  return <form onSubmit={/* ... */}>{/* ... */}</form>;
}
```

### Option 2: Manual Definition

If you prefer to define your API manually, you can use either file-based routing or a single API tree. [See the manual setup documentation](#manual-setup).

## OpenAPI Import Options

```bash
npx apity-import --help

Usage: apity-import [options] <file>

Import OpenAPI/Swagger specification and generate API routes

Arguments:
  file                     OpenAPI/Swagger specification file (JSON or YAML)

Options:
  -o, --output <type>     Output type: file-based or single-file (default: "file-based")
  -d, --outDir <dir>      Output directory (default: "src/routes" or "src")
  -h, --help              display help for command
```

The importer supports:

- OpenAPI 3.x and Swagger 2.0 specifications
- JSON and YAML formats
- Path parameters
- Query parameters
- Request bodies
- Response schemas
- All HTTP methods (GET, POST, PUT, PATCH, DELETE)

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

The generic type parameters for `createApiEndpoint` are:

```typescript
createApiEndpoint<
  TResponse = unknown,  // Response data type
  TBody = void,        // Request body type
  TQuery = void,       // Query parameters type
  TParams = void       // Path parameters type (usually inferred)
>
```

```typescript
// src/routes/users/index.ts
import { z } from "zod";
import { createApiEndpoint } from "@danstackme/apity";

// Using Zod schemas (recommended for runtime validation)
export const GET = createApiEndpoint({
  response: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    })
  ),
});

// Using TypeScript types/interfaces (no runtime validation)
interface User {
  id: string;
  name: string;
}

interface CreateUserBody {
  name: string;
}

export const POST = createApiEndpoint<User, CreateUserBody>({
  method: "POST",
});

// Mix and match Zod and TypeScript types
interface UpdateUserBody {
  name?: string;
  email?: string;
}

export const PUT = createApiEndpoint<
  User, // Response type
  UpdateUserBody, // Body type
  {
    // Query params type
    include: string[];
  }
>({
  method: "PUT",
  // You can still use Zod for partial runtime validation
  querySchema: z.object({
    include: z.array(z.string()),
  }),
});

// Using type aliases and generics
type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
};

type SearchQuery = {
  q: string;
  page?: number;
  limit?: number;
};

export const SEARCH = createApiEndpoint<
  PaginatedResponse<User>,
  void,
  SearchQuery
>({
  method: "GET",
});
```

```typescript
// src/routes/users/[id]/index.ts
import { z } from "zod";
import { createApiEndpoint } from "@danstackme/apity";

// Example combining TypeScript types with Zod schemas
interface UserWithDetails {
  id: string;
  name: string;
  email: string;
  profile: {
    avatar: string;
    bio: string;
  };
}

type IncludeQuery = {
  include?: ("posts" | "comments")[];
};

export const GET = createApiEndpoint<UserWithDetails, void, IncludeQuery>({
  method: "GET",
  // Optional runtime validation for specific fields
  querySchema: z.object({
    include: z.array(z.enum(["posts", "comments"])).optional(),
  }),
});

// Using discriminated unions
type UserUpdate =
  | { type: "profile"; bio: string; avatar?: string }
  | { type: "settings"; theme: "light" | "dark"; notifications: boolean };

export const PATCH = createApiEndpoint<UserWithDetails, UserUpdate>({
  method: "PATCH",
  // Optional runtime validation for complex types
  bodySchema: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("profile"),
      bio: z.string(),
      avatar: z.string().optional(),
    }),
    z.object({
      type: z.literal("settings"),
      theme: z.enum(["light", "dark"]),
      notifications: z.boolean(),
    }),
  ]),
});

export const DELETE = createApiEndpoint<void>({
  method: "DELETE",
});
```

3. Initialize your API client:

```typescript
// src/api.ts
import { createApi } from "@danstackme/apity";
import type { ApiTree } from "./generated/apiTree.gen";

export const api = createApi<ApiTree>({
  baseURL: "https://api.example.com",
});
```

4. Use in your components:

```typescript
import { useFetch, useMutate } from "@danstackme/apity";

function UserComponent() {
  // TypeScript will infer all types correctly
  const { data: users } = useFetch('/users');
  const { data: userWithDetails } = useFetch('/users/[id]', {
    params: { id: '123' },
    query: { include: ['posts'] } // Type-checked: only 'posts' | 'comments' allowed
  });

  const { mutate: updateUser } = useMutate('/users/[id]', {
    method: 'PATCH',
    params: { id: '123' }
  });

  // Type-checked: must match UserUpdate type
  const handleUpdateProfile = () => {
    updateUser({
      type: 'profile',
      bio: 'New bio'
    });
  };

  const handleUpdateSettings = () => {
    updateUser({
      type: 'settings',
      theme: 'dark',
      notifications: true
    });
  };

  return (/* ... */);
}
```

When using TypeScript types instead of Zod schemas:

- You get full type safety during development
- No runtime validation is performed (unless you provide optional schemas)
- Smaller bundle size as Zod schemas aren't included
- Better support for complex types like generics and unions

When using Zod schemas:

- You get both type safety and runtime validation
- Automatic error messages for invalid data
- Easier data transformation and parsing
- Slightly larger bundle size

You can mix and match both approaches based on your needs!

### Inline API Definition

You can also define your API inline without file-based routing:

```typescript
import { z } from "zod";
import { createApi } from "@danstackme/apity";

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
