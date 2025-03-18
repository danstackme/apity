import { ApiProvider } from "@danstackme/apity";
import "./App.css";
import { UserList } from "./components/UserList";
import { api } from "./endpoints/users";

import "@danstackme/apity";

// Augment the Register interface with our API type
declare module "@danstackme/apity" {
  interface Register {
    api: typeof api;
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
