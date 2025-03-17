import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiProvider, useFetch, useMutate } from "@danstackme/apity";
import { GET as getPets, POST as createPet } from "./routes/pets";
import { GET as getPetById, PUT as updatePet } from "./routes/pets._id_";
import "./App.css";

// Create a client
const queryClient = new QueryClient();

// Example components using file-based routing
function PetsListFileBasedExample() {
  const { data, isLoading, error } = useFetch("/pets", {
    endpoint: getPets,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Pets List (File-based)</h2>
      <ul>
        {data?.pets.map((pet) => (
          <li key={pet.id}>
            {pet.name} - {pet.type}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Example components using single-file API tree
function PetsListSingleFileExample() {
  const { data, isLoading, error } = useFetch("/pets", {
    endpoint: api.apiTree["/pets"].GET,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Pets List (Single-file)</h2>
      <ul>
        {data?.pets.map((pet) => (
          <li key={pet.id}>
            {pet.name} - {pet.type}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Example form component for creating pets
function CreatePetForm() {
  const [name, setName] = useState("");
  const [type, setType] = useState("");

  const { mutate, isLoading } = useMutate("/pets", {
    method: "POST",
    endpoint: createPet,
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
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Creating..." : "Create Pet"}
      </button>
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
