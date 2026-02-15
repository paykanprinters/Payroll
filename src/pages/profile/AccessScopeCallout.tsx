"use client";

import React from "react";
import { cn } from "@/lib/utils";

export default function AccessScopeCallout({
  title,
  description,
  className,
}: {
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border bg-blue-50 p-4 text-blue-900", className)}>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <p className="text-sm text-blue-900/80">{description}</p>
    </div>
  );
}
