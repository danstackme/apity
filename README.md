# DanStack API

A type-safe API client generator for React applications with file-based routing and runtime validation.

## Features

- 🔒 Type-safe API endpoints with TypeScript
- 📁 File-based routing for API endpoints
- 🔄 Automatic type generation
- 🎯 Runtime validation with Zod
- ⚡️ React Query integration
- 🚀 OpenAPI/Swagger support

## Installation

```bash
npm install @danstackme/apity
```

## Quick Start

1. Create your API endpoints in the `endpoints` directory:

```typescript
// endpoints/users/index.ts
import { createApiEndpoint } from "@danstackme/apity";
import { z } from "zod";

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const GET = createApiEndpoint({
  method: "GET",
  responseSchema: z.array(userSchema),
});

export const POST = createApiEndpoint({
  method: "POST",
  responseSchema: userSchema,
  bodySchema: z.object({
    name: z.string(),
  }),
});
```

2. Set up the API provider in your app:

```typescript
// src/App.tsx
import { ApiProvider } from "@danstackme/apity";

function App() {
  return (
    <ApiProvider baseURL="https://api.example.com">
      <YourApp />
    </ApiProvider>
  );
}
```

3. Use the hooks in your components:

```typescript
// src/components/UserList.tsx
import { useFetch, useMutate } from "@danstackme/apity";

function UserList() {
  const { data: users } = useFetch("/users");
  const createUser = useMutate("/users", { method: "POST" });

  return (
    <div>
      {users?.map((user) => (
        <div key={user.id}>{user.name}</div>
      ))}
      <button onClick={() => createUser.mutate({ name: "New User" })}>
        Add User
      </button>
    </div>
  );
}
```

## Type Generation

The package automatically generates types for your API endpoints. This happens:

1. After installation (via postinstall script)
2. When you run the type generation command
3. Automatically during development when using the Vite plugin

You can generate types at any time by running:

```bash
npx apity-generate
```

### Development Mode

If you're using Vite, you can add the Apity plugin to automatically generate types during development:

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { apityPlugin } from "@danstackme/apity/vite";

export default defineConfig({
  plugins: [
    apityPlugin(),
    // ... other plugins
  ],
});
```

This will automatically watch your `endpoints` directory and regenerate types when you make changes.

## API Reference

### `useFetch`

```typescript
function useFetch<TPath extends PathOf<ApiTree>>(
  path: TPath,
  options?: UseFetchOptions<TPath>
);
```

Fetches data from an API endpoint.

```typescript
const { data, isLoading, error } = useFetch("/users", {
  params: { id: "123" },
  query: { filter: "active" },
});
```

### `useMutate`

```typescript
function useMutate<TPath extends PathOf<ApiTree>>(
  path: TPath,
  options: UseMutateOptions<TPath>
);
```

Performs mutations (POST, PUT, DELETE) on an API endpoint.

```typescript
const { mutate, isLoading, error } = useMutate("/users", {
  method: "POST",
  onSuccess: (data) => {
    console.log("User created:", data);
  },
});
```

## File Structure

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

## License

MIT
