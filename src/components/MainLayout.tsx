"use client";

import React from "react";
import Sidebar from "./Sidebar";
import { MadeWithDyad } from "./made-with-dyad";
import { useIsMobile } from "@/hooks/use-mobile";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] lg:grid-cols-[240px_1fr]">
      {!isMobile && <Sidebar />}
      <div className="flex flex-col">
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
        <MadeWithDyad />
      </div>
      {isMobile && <Sidebar />} {/* Render mobile sidebar as an overlay */}
    </div>
  );
};

export default MainLayout;