"use client";

import React from "react";
import { Outlet, Route, Routes, Navigate } from "react-router-dom";
import SettingsLayout from "./settings/SettingsLayout";
import CompanyDetails from "./settings/CompanyDetails";
import BiometricDevices from "./settings/BiometricDevices";
import TaxLiabilities from "./settings/TaxLiabilities";
import PayslipDesign from "./settings/PayslipDesign";
import MockData from "./settings/MockData";
// import Savings from "./settings/Savings"; // Removed import as it's now a top-level page

const Settings: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<SettingsLayout />}>
        {/* Default route for /settings, redirects to /settings/company-details */}
        <Route index element={<Navigate to="company-details" replace />} />
        <Route path="company-details" element={<CompanyDetails />} />
        <Route path="biometric-devices" element={<BiometricDevices />} />
        <Route path="tax-liabilities" element={<TaxLiabilities />} />
        <Route path="payslip-design" element={<PayslipDesign />} />
        {/* <Route path="savings" element={<Savings />} /> Removed route for savings */}
        <Route path="mock-data" element={<MockData />} />
        {/* Add more settings sub-routes here */}
      </Route>
    </Routes>
  );
};

export default Settings;