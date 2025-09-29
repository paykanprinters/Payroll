"use client";

import React from "react";

const Reports: React.FC = () => {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Payroll Reports & Analytics</h1>
      <p className="text-lg text-muted-foreground">
        Access various payroll reports, including tax summaries, deduction reports, and financial overviews.
      </p>
      <div className="mt-4 p-4 border rounded-lg bg-purple-50 text-purple-800">
        <h3 className="font-semibold text-lg mb-2">Reporting Tools</h3>
        <p className="text-sm">
          This area would contain filters for report generation (e.g., by date, department), and display various charts and tables summarizing payroll data.
        </p>
      </div>
    </div>
  );
};

export default Reports;