import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./components/MainLayout";
import Login from "./pages/Login";
import Unauthorized from "./pages/Unauthorized";
import StaffLogin from "./pages/StaffLogin";
import { AuthProvider } from "./context/AuthContext";
import { PayrollDataProvider } from "./context/PayrollDataContext";
import ProtectedRoute from "./components/ProtectedRoute";
import React, { Suspense, lazy } from "react";
import AutoRefreshOnFocus from "./components/AutoRefreshOnFocus";
import ErrorBoundary from "./components/ErrorBoundary";
const RootHome = lazy(() => import("./pages/RootHome"));
const StaffHome = lazy(() => import("./pages/StaffHome"));
const ToDosPage = lazy(() => import("./pages/ToDosPage"));
const Timesheet = lazy(() => import("./pages/Timesheet"));
const Payslips = lazy(() => import("./pages/Payslips"));
const LoansAndAdvancements = lazy(() => import("./pages/LoansAndAdvancements"));
const Savings = lazy(() => import("./pages/Savings"));
const VacationAbsence = lazy(() => import("./pages/VacationAbsence"));
const Profile = lazy(() => import("./pages/Profile"));
const Docs = lazy(() => import("./pages/Docs"));
const AnalyticsStaff = lazy(() => import("./pages/AnalyticsStaff"));
const Employees = lazy(() => import("./pages/Employees"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const PaymentBatches = lazy(() => import("./pages/payroll/PaymentBatches"));
const PaymentBatchDetail = lazy(() => import("./pages/payroll/PaymentBatchDetail"));
const CompensationComponents = lazy(() => import("./pages/payroll/CompensationComponents"));
const EmployeeAssignments = lazy(() => import("./pages/payroll/EmployeeAssignments"));
const OvertimeRules = lazy(() => import("./pages/payroll/OvertimeRules"));
const ExceptionsDashboard = lazy(() => import("./pages/payroll/ExceptionsDashboard"));
const PayrollRuns = lazy(() => import("./pages/payroll/PayrollRuns"));
const PayrollRunDetail = lazy(() => import("./pages/payroll/PayrollRunDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const portalType = (import.meta.env.VITE_PORTAL || "admin").toLowerCase();

const App = () => {
  const isStaffPortal = portalType === "staff";

  // Dyad preview runs the app embedded in an iframe. HashRouter is more reliable there,
  // because some hosts block or interfere with history.pushState-based navigation.
  const isEmbedded = (() => {
    if (typeof window === "undefined") return false;
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const Router = isEmbedded ? HashRouter : BrowserRouter;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AutoRefreshOnFocus />
        <Router>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/employee" element={<StaffLogin />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route element={<ProtectedRoute />}>
                <Route
                  element={
                    <ErrorBoundary fallbackTitle="Page error">
                      <PayrollDataProvider>
                        <MainLayout />
                      </PayrollDataProvider>
                    </ErrorBoundary>
                  }
                >
                  {isStaffPortal ? (
                    <>
                      <Route path="/" element={<StaffHome />} />
                      <Route path="/dashboard" element={<StaffHome />} />
                      <Route path="/timesheet" element={<Timesheet />} />
                      <Route path="/payslips/*" element={<Payslips />} />
                      <Route path="/savings" element={<Savings />} />
                      <Route path="/vacation-absence" element={<VacationAbsence />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/docs" element={<Docs />} />
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
                      <Route path="/docs" element={<Docs />} />
                      
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
                        <Route path="/payroll/batches" element={<PaymentBatches />} />
                        <Route path="/payroll/batches/:id" element={<PaymentBatchDetail />} />
                        <Route path="/payroll/components" element={<CompensationComponents />} />
                        <Route path="/payroll/assignments" element={<EmployeeAssignments />} />
                        <Route path="/payroll/overtime-rules" element={<OvertimeRules />} />
                        <Route path="/payroll/exceptions" element={<ExceptionsDashboard />} />
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
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;