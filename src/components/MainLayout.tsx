"use client";

import React from "react";
import Sidebar from "./Sidebar";
import { MadeWithDyad } from "./made-with-dyad";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Outlet } from "react-router-dom";

interface MainLayoutProps {
  // children: React.ReactNode; // No longer directly takes children, uses Outlet
}

const MainLayout: React.FC<MainLayoutProps> = () => {
  const { isAuthenticated, logout } = useAuth();
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  // Define grid columns dynamically based on isCollapsed state
  const gridColsClass = isCollapsed
    ? "md:grid-cols-[70px_1fr] lg:grid-cols-[70px_1fr]"
    : "md:grid-cols-[240px_1fr] lg:grid-cols-[240px_1fr]";

  if (!isAuthenticated) {
    // If not authenticated, don't render the layout, just the content (e.g., Login page)
    return <Outlet />;
  }

  return (
    <div className={cn("grid min-h-screen w-full", gridColsClass)}>
      {!isMobile && <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />}
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
          <div className="flex-1">
            {/* Placeholder for potential header content like breadcrumbs or page title */}
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <Outlet />
        </main>
        <MadeWithDyad />
      </div>
      {isMobile && <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />}
    </div>
  );
};

export default MainLayout;