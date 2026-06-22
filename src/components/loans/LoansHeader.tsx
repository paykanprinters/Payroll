"use client";

import React from "react";
import { Landmark } from "lucide-react";
import KanPageBanner from "@/components/KanPageBanner";

const LoansHeader: React.FC = () => {
  return (
    <KanPageBanner
      icon={Landmark}
      title="Loans & Advancements"
      description="Track lending, repayments, and outstanding balances."
    />
  );
};

export default LoansHeader;
