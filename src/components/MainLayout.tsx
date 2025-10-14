"use client";

import React from "react";
import Sidebar from "./Sidebar";
import { MadeWithDyad } from "./made-with-dyad";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Settings as SettingsIcon, LayoutDashboard, User, Loader2 } from "lucide-react"; // Import User icon
import { Outlet, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCompanyDetails } from "@/hooks/use-company-details"; // Import the new hook

interface MainLayoutProps {
  // children: React.ReactNode; // No longer directly takes children, uses Outlet
}

const MainLayout: React.FC<MainLayoutProps> = () => {
  const { isAuthenticated, logout, user, isLoadingAuth } = useAuth();
  const { companyDetails, isLoading: isLoadingCompanyDetails } = useCompanyDetails(); // Fetch company details from Supabase
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const navigate = useNavigate();

  // Define grid columns dynamically based on isCollapsed state
  const gridColsClass = isCollapsed
    ? "md:grid-cols-[70px_1fr] lg:grid-cols-[70px_1fr]"
    : "md:grid-cols-[240px_1fr] lg:grid-cols-[240px_1fr]";

  // Check mock data status from localStorage
  const isMockDataEnabled = localStorage.getItem("isMockDataEnabled") === "true";

  if (isLoadingAuth || isLoadingCompanyDetails) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // If not authenticated, don't render the layout, just the content (e.g., Login page)
    return <Outlet />;
  }

  return (
    <div className={cn("grid min-h-screen w-full", gridColsClass)}>
      {!isMobile && (
        <Sidebar
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          companyDetails={companyDetails} // Pass Supabase company details
          isMockDataEnabled={isMockDataEnabled} // Pass mock data status
        />
      )}
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
          <div className="flex-1">
            {/* Placeholder for potential header content like breadcrumbs or page title */}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-auto flex items-center justify-center space-x-2 py-1">
                <User className="h-4 w-4" />
                <div className="flex flex-col items-start">
                  <span className="font-medium text-sm leading-none">{user?.name}</span>
                  <span className="text-xs text-muted-foreground leading-none">{user?.email || ""}</span>
                </div>
                <SettingsIcon className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings/user-control-panel')}>
                <SettingsIcon className="mr-2 h-4 w-4" />
                <span>Account Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <Outlet />
        </main>
        <MadeWithDyad />
      </div>
      {isMobile && (
        <Sidebar
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          companyDetails={companyDetails} // Pass Supabase company details
          isMockDataEnabled={isMockDataEnabled} // Pass mock data status
        />
      )}
    </div>
  );
};

export default MainLayout;