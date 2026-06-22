"use client";

import React from "react";
import { Settings as SettingsIcon } from "lucide-react";
import KanPageBanner from "@/components/KanPageBanner";

const SettingsHeader: React.FC = () => {
  return (
    <KanPageBanner
      icon={SettingsIcon}
      title="Settings"
      description="Configure company, payroll, and user preferences."
    />
  );
};

export default SettingsHeader;
