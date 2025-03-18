import { useFetch, useMutate } from "@danstackme/apity";
import type { Register } from "@danstackme/apity";
import type { api } from "../endpoints/users";

declare module "@danstackme/apity" {
  interface Register {
    apiTree: typeof api.apiTree;
  }
}

export function UserList() {
  const { data: users, isLoading } = useFetch("/users", {
    query: {
      limit: 10,
      offset: 0,
    },
  });

  const { mutate: createUser, isPending: isCreating } = useMutate("/", {
    method: "post",
  });

  const { mutate: deleteUser } = useMutate("/users/:id", {
    method: "post",
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Users</h1>

      {/* Create user form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          createUser({
            body: {
              name: formData.get("name") as string,
              email: formData.get("email") as string,
            },
          });
        }}
        className="mb-6 space-y-4"
      >
        <div>
          <input
            type="text"
            name="name"
            placeholder="Name"
            className="border p-2 rounded"
            required
          />
        </div>
        <div>
          <input
            type="email"
            name="email"
            placeholder="Email"
            className="border p-2 rounded"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isCreating}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {isCreating ? "Creating..." : "Create User"}
        </button>
      </form>

      {/* Users list */}
      <div className="space-y-4">
        {users?.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between border p-4 rounded"
          >
            <div>
              <h3 className="font-semibold">{user.name}</h3>
              <p className="text-gray-600">{user.email}</p>
            </div>
            <button
              onClick={() => deleteUser({ params: user.id })}
              className="text-red-500 hover:text-red-700"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
