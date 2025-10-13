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
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Protected Routes wrapped by MainLayout */}
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/todos" element={<ToDosPage />} />
                <Route path="/employees" element={<Employees />} />
                <Route path="/timesheet" element={<Timesheet />} />
                <Route path="/payslips/*" element={<Payslips />} />
                <Route path="/loans-advancements" element={<LoansAndAdvancements />} />
                <Route path="/savings" element={<Savings />} />
                <Route path="/vacation-absence" element={<VacationAbsence />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings/*" element={<Settings />} />
                {/* Catch-all for 404 within protected routes */}
                <Route path="*" element={<NotFound />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;