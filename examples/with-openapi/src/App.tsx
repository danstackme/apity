import { ApiProvider, useFetch, useMutate } from "@danstackme/apity";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import "./App.css";

// Create a client
const queryClient = new QueryClient();

// Example components using file-based routing
function PetsListFileBasedExample() {
  const { data, isLoading, error } = useFetch("/pets");

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Pets List (File-based)</h2>
      <ul>
        {data?.pets.map(
          (pet: { id: string | number; name: string; type: string }) => (
            <li key={pet.id}>
              {pet.name} - {pet.type}
            </li>
          )
        )}
      </ul>
    </div>
  );
}

// Example components using single-file API tree
function PetsListSingleFileExample() {
  const { data, isLoading, error } = useFetch("/pets");

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Pets List (Single-file)</h2>
      <ul>
        {data?.pets.map(
          (pet: { id: string | number; name: string; type: string }) => (
            <li key={pet.id}>
              {pet.name} - {pet.type}
            </li>
          )
        )}
      </ul>
    </div>
  );
}

// Example form component for creating pets
function CreatePetForm() {
  const [name, setName] = useState("");
  const [type, setType] = useState("");

  const { mutate } = useMutate("/pets", {
    method: "POST",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({ name, type });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Create New Pet</h2>
      <div>
        <label>
          Name:
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
      </div>
      <div>
        <label>
          Type:
          <input
            type="text"
            value={type}
            onChange={(e) => setType(e.target.value)}
            required
          />
        </label>
      </div>
    </form>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ApiProvider baseURL="https://petstore.swagger.io/v2">
        <div className="app">
          <h1>@danstackme/apity OpenAPI Example</h1>
          <div className="examples">
            <div className="example-section">
              <PetsListFileBasedExample />
              <PetsListSingleFileExample />
            </div>
            <div className="example-section">
              <CreatePetForm />
            </div>
          </div>
        </div>
      </ApiProvider>
    </QueryClientProvider>
  );
}

export default App;
