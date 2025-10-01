"use client";

import React from "react";
import Sidebar from "./Sidebar";
import { MadeWithDyad } from "./made-with-dyad";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils"; // Import cn for conditional class names

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = React.useState(false); // State to manage sidebar collapse

  // Define grid columns dynamically based on isCollapsed state
  const gridColsClass = isCollapsed
    ? "md:grid-cols-[70px_1fr] lg:grid-cols-[70px_1fr]" // Collapsed sidebar width
    : "md:grid-cols-[240px_1fr] lg:grid-cols-[240px_1fr]"; // Expanded sidebar width

  return (
    <div className={cn("grid min-h-screen w-full", gridColsClass)}>
      {!isMobile && <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />}
      <div className="flex flex-col">
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
        <MadeWithDyad />
      </div>
      {isMobile && <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />} {/* Render mobile sidebar as an overlay */}
    </div>
  );
};

export default MainLayout;