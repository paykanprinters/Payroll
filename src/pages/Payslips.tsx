"use client";

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PayslipOverviewPage from "./payslips/PayslipOverviewPage";
import Irp5ExportPage from "./payslips/Irp5ExportPage";

const Payslips: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<PayslipOverviewPage />} />
      <Route path="/overview" element={<PayslipOverviewPage />} />
      <Route path="/irp5-export" element={<Irp5ExportPage />} />
      {/* Add more payslip sub-routes here if needed */}
      <Route path="*" element={<Navigate to="/payslips/overview" replace />} />
    </Routes>
  );
};

export default Payslips;