"use client";

import React from "react";
import { Settings2 } from "lucide-react";
import KanPageBanner from "@/components/KanPageBanner";

type PayrollAdminHeaderProps = {
  title: string;
  subtitle: string;
};

const PayrollAdminHeader: React.FC<PayrollAdminHeaderProps> = ({ title, subtitle }) => {
  return <KanPageBanner icon={Settings2} title={title} description={subtitle} />;
};

export default PayrollAdminHeader;
