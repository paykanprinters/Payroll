"use client";

import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import SettingsLayout from "./settings/SettingsLayout";
import CompanyDetails from "./settings/CompanyDetails";
import BiometricDevices from "./settings/BiometricDevices";
import TaxLiabilities from "./settings/TaxLiabilities";
import PayslipDesign from "./settings/PayslipDesign";
import DataVisuals from "./settings/DataVisuals";
import ReportDesign from "./settings/ReportDesign";
import WorkHours from "./settings/WorkHours";
import UserControlPanel from "./settings/UserControlPanel";
import PayCycleSettingsPage from "./settings/PayCycleSettings";

const Settings: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<SettingsLayout />}>
        <Route index element={<Navigate to="company-details" replace />} />
        <Route path="company-details" element={<CompanyDetails />} />
        <Route path="work-hours" element={<WorkHours />} />
        <Route path="pay-cycle-settings" element={<PayCycleSettingsPage />} />
        <Route path="biometric-devices" element={<BiometricDevices />} />
        <Route path="tax-liabilities" element={<TaxLiabilities />} />
        <Route path="payslip-design" element={<PayslipDesign />} />
        <Route path="report-design" element={<ReportDesign />} />
        <Route path="data-visuals" element={<DataVisuals />} />
        <Route path="user-control-panel" element={<UserControlPanel />} />
      </Route>
    </Routes>
  );
};

export default Settings;