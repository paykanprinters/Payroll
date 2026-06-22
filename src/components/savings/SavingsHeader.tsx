"use client";

import React from "react";
import { PiggyBank } from "lucide-react";
import KanPageBanner from "@/components/KanPageBanner";

const SavingsHeader: React.FC = () => {
  return (
    <KanPageBanner
      icon={PiggyBank}
      title="Employee Savings"
      description="Manage recurring savings plans and contributions."
    />
  );
};

export default SavingsHeader;
