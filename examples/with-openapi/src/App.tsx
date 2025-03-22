import { ApiProvider } from "@danstackme/apity";
import "./App.css";
import { UserList } from "./components/UserList";
import { api, fetchEndpoints, mutateEndpoints } from "./endpoints";

declare module "@danstackme/apity" {
  interface Register {
    fetchEndpoints: typeof fetchEndpoints;
    mutateEndpoints: typeof mutateEndpoints;
  }
}

export function App() {
  return (
    <ApiProvider api={api}>
      <div className="container mx-auto">
        <UserList />
      </div>
    </ApiProvider>
  );
}
