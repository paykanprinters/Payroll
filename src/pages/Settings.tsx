"use client";

import React from "react";
import { Outlet, Route, Routes, Navigate } from "react-router-dom";
import SettingsLayout from "./settings/SettingsLayout";
import CompanyDetails from "./settings/CompanyDetails";
import BiometricDevices from "./settings/BiometricDevices";
import TaxLiabilities from "./settings/TaxLiabilities";
import PayslipDesign from "./settings/PayslipDesign";
import MockData from "./settings/MockData";
import DataVisuals from "./settings/DataVisuals";
import ReportDesign from "./settings/ReportDesign";
import WorkHours from "./settings/WorkHours";
import UserControlPanel from "./settings/UserControlPanel";
import PayCycleSettingsPage from "./settings/PayCycleSettings"; // New import

const Settings: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<SettingsLayout />}>
        {/* Default route for /settings, redirects to /settings/company-details */}
        <Route index element={<Navigate to="company-details" replace />} />
        <Route path="company-details" element={<CompanyDetails />} />
        <Route path="work-hours" element={<WorkHours />} />
        <Route path="pay-cycle-settings" element={<PayCycleSettingsPage />} /> {/* New route */}
        <Route path="biometric-devices" element={<BiometricDevices />} />
        <Route path="tax-liabilities" element={<TaxLiabilities />} />
        <Route path="payslip-design" element={<PayslipDesign />} />
        <Route path="report-design" element={<ReportDesign />} />
        <Route path="mock-data" element={<MockData />} />
        <Route path="data-visuals" element={<DataVisuals />} />
        <Route path="user-control-panel" element={<UserControlPanel />} />
        {/* Add more settings sub-routes here */}
      </Route>
    </Routes>
  );
};

export default Settings;