import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";   // ✅ added

import App from "./App";
import "./styles/index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>   {/* ✅ enables URL routing */}
      <App />
    </BrowserRouter>
  </StrictMode>
);