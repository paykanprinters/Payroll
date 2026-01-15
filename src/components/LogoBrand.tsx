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
  logoWidthPx?: number;
  logoHeightPx?: number;
  logoFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
};

const sizeHeightClass = {
  sm: "h-10",
  md: "h-14",
  lg: "h-20",
};

const LogoBrand: React.FC<LogoBrandProps> = ({
  className = "",
  size = "md",
  align = "left",
  showName = true,
  name,
  logoUrl,
  logoWidthPx,
  logoHeightPx,
  logoFit,
}) => {
  const env = getBranding();
  const finalName = name || env.name || "Your Company Name";
  const finalLogoUrl = logoUrl || env.logoUrl || "/logonscreen_for_workflow.png";

  const containerAlign = align === "center" ? "justify-center text-center" : "justify-start text-left";
  const imgDefaultHeight = sizeHeightClass[size];

  return (
    <div className={`flex flex-col items-center ${containerAlign} ${className}`}>
      <div className={`flex items-center ${containerAlign}`}>
        {finalLogoUrl ? (
          <img
            src={finalLogoUrl}
            alt={`${finalName} Logo`}
            className={`object-contain w-auto ${logoHeightPx ? "" : imgDefaultHeight}`}
            style={{
              width: logoWidthPx ? `${logoWidthPx}px` : undefined,
              height: logoHeightPx ? `${logoHeightPx}px` : undefined,
              objectFit: logoFit || "contain",
            }}
          />
        ) : (
          <div className={`flex items-center ${containerAlign} ${imgDefaultHeight} w-[160px] rounded-md bg-gradient-to-r from-sky-400 via-indigo-500 to-fuchsia-500`} />
        )}
      </div>
      {showName && (
        <span className="mt-2 font-semibold">
          {finalName}
        </span>
      )}
    </div>
  );
};

export default LogoBrand;