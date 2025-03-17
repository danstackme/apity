import { useFetch, useMutate } from "type-safe-api";

export function UserComponent({ id }: { id: string }) {
  const { data: user } = useFetch("/users/[id]", {
    params: { id },
    query: { include: ["posts"] },
  });

  const { mutate: updateUser } = useMutate("/users/[id]", "PUT", {
    params: { id },
  });

  return (
    <div>
      <h1>{user?.name}</h1>
      <button onClick={() => updateUser({ name: "New Name" })}>
        Update Name
      </button>
    </div>
  );
}
