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
import NotFound from "./pages/NotFound";
// import PayrollLayout from "./pages/payroll/PayrollLayout"; // Removed
// import UpcomingPayrollCard from "./components/payroll/UpcomingPayrollCard"; // Moved to Dashboard

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/payslips" element={<Payslips />} />
            <Route path="/loans-advancements" element={<LoansAndAdvancements />} />
            <Route path="/savings" element={<Savings />} />
            <Route path="/vacation-absence" element={<VacationAbsence />} />
            <Route path="/reports" element={<Reports />} />
            
            {/* Payroll Route removed, content moved to Dashboard */}
            {/* <Route path="/payroll" element={<PayrollLayout />}>
              <Route index element={<UpcomingPayrollCard />} />
            </Route> */}

            <Route path="/settings/*" element={<Settings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;