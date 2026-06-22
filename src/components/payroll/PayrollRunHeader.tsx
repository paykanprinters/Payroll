"use client";

import React from "react";
import { ReceiptText } from "lucide-react";
import KanPageBanner from "@/components/KanPageBanner";

type PayrollRunHeaderProps = {
  title?: string;
  subtitle?: string;
};

const PayrollRunHeader: React.FC<PayrollRunHeaderProps> = ({
  title = "Payroll Run",
  subtitle = "Review readiness, generate items, and complete approvals with a clean audit trail.",
}) => {
  return <KanPageBanner icon={ReceiptText} title={title} description={subtitle} />;
};

export default PayrollRunHeader;
