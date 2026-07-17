"use client";

import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

const PayslipOverviewPage = lazy(() => import("./payslips/PayslipOverviewPage"));
const Irp5ExportPage = lazy(() => import("./payslips/Irp5ExportPage"));

const Payslips: React.FC = () => {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<PayslipOverviewPage />} />
        <Route path="/overview" element={<PayslipOverviewPage />} />
        <Route path="/irp5-export" element={<Irp5ExportPage />} />
        {/* Add more payslip sub-routes here if needed */}
        <Route path="*" element={<Navigate to="/payslips/overview" replace />} />
      </Routes>
    </Suspense>
  );
};

export default Payslips;