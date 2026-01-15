"use client";

import React from "react";
import { getBranding } from "@/config/branding";

type LogoBrandProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  align?: "left" | "center";
  showName?: boolean;
};

const sizeMap = {
  sm: { container: "h-10", img: "max-h-10", name: "text-base" },
  md: { container: "h-14", img: "max-h-14", name: "text-lg" },
  lg: { container: "h-20", img: "max-h-20", name: "text-xl" },
};

const LogoBrand: React.FC<LogoBrandProps> = ({ className = "", size = "md", align = "left", showName = true }) => {
  const b = getBranding();
  const name = b.name || "Your Company Name";
  const logoUrl = b.logoUrl;

  const alignClass = align === "center" ? "justify-center text-center" : "justify-start text-left";
  const s = sizeMap[size];

  return (
    <div className={`flex items-center ${alignClass} ${s.container} ${className}`}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`${name} Logo`}
          className={`object-contain ${s.img} w-auto drop-shadow-sm`}
        />
      ) : (
        <div className={`flex items-center ${alignClass} ${s.container}`}>
          <div className="h-full aspect-[2.5/1] rounded-md bg-gradient-to-r from-sky-400 via-indigo-500 to-fuchsia-500" />
        </div>
      )}
      {showName && (
        <span className={`ml-3 font-semibold ${align === "center" ? "ml-0 mt-2 block" : ""} ${s.name}`}>
          {name}
        </span>
      )}
    </div>
  );
};

export default LogoBrand;