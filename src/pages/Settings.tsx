"use client";

import React from "react";
import { Outlet, Route, Routes, Navigate } from "react-router-dom";
import SettingsLayout from "./settings/SettingsLayout";
import CompanyDetails from "./settings/CompanyDetails";
import BiometricDevices from "./settings/BiometricDevices";
import TaxLiabilities from "./settings/TaxLiabilities"; // Import the new component

const Settings: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<SettingsLayout />}>
        {/* Default route for /settings, redirects to /settings/company-details */}
        <Route index element={<Navigate to="company-details" replace />} />
        <Route path="company-details" element={<CompanyDetails />} />
        <Route path="biometric-devices" element={<BiometricDevices />} />
        <Route path="tax-liabilities" element={<TaxLiabilities />} /> {/* New route for tax liabilities */}
        {/* Add more settings sub-routes here */}
      </Route>
    </Routes>
  );
};

export default Settings;