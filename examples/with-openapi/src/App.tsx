import { ApiProvider } from "@danstackme/apity";
import "./App.css";
import { UserList } from "./components/UserList";
import { api, endpoints } from "./endpoints";

declare module "@danstackme/apity" {
  interface Register {
    endpoints: typeof endpoints;
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
