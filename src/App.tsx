import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./components/MainLayout";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Payslips from "./pages/Payslips";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import LoansAndAdvancements from "./pages/LoansAndAdvancements";
import Savings from "./pages/Savings";
import VacationAbsence from "./pages/VacationAbsence";
import Analytics from "./pages/Analytics";
import Timesheet from "./pages/Timesheet";
import NotFound from "./pages/NotFound";
import ToDosPage from "./pages/ToDosPage";
import Login from "./pages/Login";
import Unauthorized from "./pages/Unauthorized";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import React from "react";
import AutoRefreshOnFocus from "./components/AutoRefreshOnFocus";
import Profile from "./pages/Profile";

const queryClient = new QueryClient();

const App = () => {
  console.log("App.tsx: Initial localStorage.isMockDataEnabled:", localStorage.getItem("isMockDataEnabled"));
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AutoRefreshOnFocus />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/todos" element={<ToDosPage />} />
                  <Route path="/timesheet" element={<Timesheet />} />
                  <Route path="/payslips/*" element={<Payslips />} />
                  <Route path="/loans-advancements" element={<LoansAndAdvancements />} />
                  <Route path="/savings" element={<Savings />} />
                  <Route path="/vacation-absence" element={<VacationAbsence />} />
                  <Route path="/profile" element={<Profile />} />

                  {/* Manager/Admin-only routes */}
                  <Route element={<ProtectedRoute allowedRoles={['Admin', 'Manager']} />}>
                    <Route path="/employees" element={<Employees />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/reports" element={<Reports />} />
                  </Route>

                  {/* Admin-only settings */}
                  <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
                    <Route path="/settings/*" element={<Settings />} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Route>
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;