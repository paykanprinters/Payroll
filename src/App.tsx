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
import AnalyticsStaff from "./pages/AnalyticsStaff";
import Timesheet from "./pages/Timesheet";
import NotFound from "./pages/NotFound";
import ToDosPage from "./pages/ToDosPage";
import Login from "./pages/Login";
import Unauthorized from "./pages/Unauthorized";
import StaffLogin from "./pages/StaffLogin";
import RootHome from "./pages/RootHome";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import React from "react";
import AutoRefreshOnFocus from "./components/AutoRefreshOnFocus";
import Profile from "./pages/Profile";
import ErrorBoundary from "./components/ErrorBoundary";
import StaffHome from "./pages/StaffHome";
import PayrollRuns from "./pages/payroll/PayrollRuns";
import PayrollRunDetail from "./pages/payroll/PayrollRunDetail";

const queryClient = new QueryClient();

const portalType = (import.meta.env.VITE_PORTAL || "admin").toLowerCase();

const App = () => {
  const isStaffPortal = portalType === "staff";
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
              <Route path="/employee" element={<StaffLogin />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<ErrorBoundary fallbackTitle="Page error"><MainLayout /></ErrorBoundary>}>
                  {isStaffPortal ? (
                    <>
                      <Route path="/" element={<StaffHome />} />
                      <Route path="/dashboard" element={<StaffHome />} />
                      <Route path="/timesheet" element={<Timesheet />} />
                      <Route path="/payslips/*" element={<Payslips />} />
                      <Route path="/savings" element={<Savings />} />
                      <Route path="/vacation-absence" element={<VacationAbsence />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/analytics/staff" element={<AnalyticsStaff />} />
                      {/* Block admin routes in staff portal */}
                      <Route path="/employees" element={<Unauthorized />} />
                      <Route path="/analytics" element={<Unauthorized />} />
                      <Route path="/reports" element={<Unauthorized />} />
                      <Route path="/settings/*" element={<Unauthorized />} />
                      <Route path="/loans-advancements" element={<Unauthorized />} />
                      <Route path="/todos" element={<Unauthorized />} />
                      <Route path="*" element={<NotFound />} />
                    </>
                  ) : (
                    <>
                      <Route path="/" element={<RootHome />} />
                      <Route path="/dashboard" element={<RootHome />} />
                      <Route path="/todos" element={<ToDosPage />} />
                      <Route path="/timesheet" element={<Timesheet />} />
                      <Route path="/payslips/*" element={<Payslips />} />
                      <Route path="/loans-advancements" element={<LoansAndAdvancements />} />
                      <Route path="/savings" element={<Savings />} />
                      <Route path="/vacation-absence" element={<VacationAbsence />} />
                      <Route path="/profile" element={<Profile />} />
                      
                      {/* Staff-only analytics route */}
                      <Route element={<ProtectedRoute allowedRoles={['Staff']} />}>
                        <Route path="/analytics/staff" element={<AnalyticsStaff />} />
                      </Route>

                      {/* Manager/Admin-only routes */}
                      <Route element={<ProtectedRoute allowedRoles={['Admin', 'Manager']} />}>
                        <Route path="/employees" element={<Employees />} />
                        <Route path="/analytics" element={<Analytics />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/payroll/runs" element={<PayrollRuns />} />
                        <Route path="/payroll/runs/:id" element={<PayrollRunDetail />} />
                      </Route>

                      {/* Admin-only settings */}
                      <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
                        <Route path="/settings/*" element={<Settings />} />
                      </Route>

                      <Route path="*" element={<NotFound />} />
                    </>
                  )}
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