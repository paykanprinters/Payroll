"use client";

import React from "react";
import { formatCurrency } from "@/lib/utils";

interface CurrencyTextProps {
  value: number;
  prefix?: string; // e.g., "R "
  className?: string;
  style?: React.CSSProperties;
}

const CurrencyText: React.FC<CurrencyTextProps> = ({ value, prefix = "R ", className, style }) => {
  return (
    <span className={className} style={style}>
      {prefix}{formatCurrency(value)}
    </span>
  );
};

export default CurrencyText;