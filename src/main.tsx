import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { LocalDataLoader } from "./components/LocalDataLoader";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LocalDataLoader>
      <App />
    </LocalDataLoader>
  </StrictMode>
);
