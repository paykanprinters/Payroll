"use client";

import React from "react";
import { getBranding } from "@/config/branding";

type LogoBrandProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  align?: "left" | "center";
  showName?: boolean;
  name?: string;
  logoUrl?: string;
};

const sizeMap = {
  sm: { container: "min-h-10", img: "max-h-10", name: "text-base" },
  md: { container: "min-h-14", img: "max-h-14", name: "text-lg" },
  lg: { container: "min-h-20", img: "max-h-20", name: "text-xl" },
};

const LogoBrand: React.FC<LogoBrandProps> = ({
  className = "",
  size = "md",
  align = "left",
  showName = true,
  name,
  logoUrl,
}) => {
  const env = getBranding();
  const finalName = name || env.name || "Your Company Name";
  const finalLogoUrl = logoUrl || env.logoUrl || "/logonscreen_for_workflow.png";

  const alignClass = align === "center" ? "justify-center text-center" : "justify-start text-left";
  const s = sizeMap[size];

  return (
    <div className={`flex flex-col items-center ${alignClass} ${className}`}>
      <div className={`flex items-center ${alignClass} ${s.container}`}>
        {finalLogoUrl ? (
          <img
            src={finalLogoUrl}
            alt={`${finalName} Logo`}
            className={`object-contain ${s.img} w-auto drop-shadow-sm`}
          />
        ) : (
          <div className={`flex items-center ${alignClass} ${s.container}`}>
            <div className="h-full aspect-[2.5/1] rounded-md bg-gradient-to-r from-sky-400 via-indigo-500 to-fuchsia-500" />
          </div>
        )}
      </div>
      {showName && (
        <span className={`mt-2 font-semibold ${s.name}`}>
          {finalName}
        </span>
      )}
    </div>
  );
};

export default LogoBrand;