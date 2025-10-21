import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import React from "react";
import { usePayrollProcessor } from "./hooks/use-payroll-processor.ts";

// Create a wrapper component to handle the dynamic title
const TitleUpdater = () => {
  const { companyDetails, isLoadingCompanyDetails } = usePayrollProcessor();

  React.useEffect(() => {
    const titleElement = document.getElementById("app-title");
    if (titleElement) {
      if (isLoadingCompanyDetails) {
        titleElement.innerText = "Loading...";
      } else if (companyDetails?.companyLegalName || companyDetails?.companyTradingName) {
        titleElement.innerText = companyDetails.companyLegalName || companyDetails.companyTradingName || "Payroll App";
      } else {
        titleElement.innerText = "Payroll App";
      }
    }
  }, [companyDetails, isLoadingCompanyDetails]);

  return null; // This component doesn't render anything visible
};

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <TitleUpdater />
  </React.StrictMode>
);