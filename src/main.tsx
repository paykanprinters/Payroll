import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import React from "react";
// Removed: import { usePayrollProcessor } from "./hooks/use-payroll-processor.ts";

// Removed: TitleUpdater component definition

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);