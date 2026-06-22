"use client";

import React from "react";

interface ChartEmptyStateProps {
  message: string;
}

const ChartEmptyState: React.FC<ChartEmptyStateProps> = ({ message }) => (
  <div className="flex h-full min-h-[200px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
    {message}
  </div>
);

export default ChartEmptyState;
