"use client";

import React from "react";

type AccentVariant = "sky" | "amber" | "emerald" | "orange";

interface SummaryAccentProps {
  variant?: AccentVariant;
  className?: string;
}

const variantClasses: Record<AccentVariant, string> = {
  sky: "from-sky-300/70 to-blue-500/70",
  amber: "from-amber-300/70 to-yellow-500/70",
  emerald: "from-emerald-300/70 to-green-500/70",
  orange: "from-orange-300/70 to-red-500/70",
};

const SummaryAccent: React.FC<SummaryAccentProps> = ({ variant = "sky", className = "" }) => {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute -top-6 -right-6 h-24 w-36 rotate-12 rounded-[24px] blur-[2px] bg-gradient-to-tr ${variantClasses[variant]} ${className}`}
    />
  );
};

export default SummaryAccent;