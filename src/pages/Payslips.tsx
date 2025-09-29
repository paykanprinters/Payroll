"use client";

import React from "react";

const Payslips: React.FC = () => {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Payslip Generation & History</h1>
      <p className="text-lg text-muted-foreground">
        Generate new payslips, view historical payslips, and manage payroll periods.
      </p>
      <div className="mt-4 p-4 border rounded-lg bg-green-50 text-green-800">
        <h3 className="font-semibold text-lg mb-2">Payslip Management Area</h3>
        <p className="text-sm">
          Here you would find tools for selecting employees, defining pay periods, and initiating the payslip generation process. Historical payslips would also be accessible.
        </p>
      </div>
    </div>
  );
};

export default Payslips;