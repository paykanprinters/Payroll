"use client";

import React from "react";

const Settings: React.FC = () => {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">System Settings</h1>
      <p className="text-lg text-muted-foreground">
        Configure general payroll settings, user permissions, and integration options.
      </p>
      <div className="mt-4 p-4 border rounded-lg bg-red-50 text-red-800">
        <h3 className="font-semibold text-lg mb-2">Configuration Area</h3>
        <p className="text-sm">
          This section would allow administrators to set up company details, define custom deduction types, manage user roles, and potentially configure integrations with other financial systems.
        </p>
      </div>
    </div>
  );
};

export default Settings;