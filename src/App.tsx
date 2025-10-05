import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./components/MainLayout";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Payslips from "./pages/Payslips"; // This is now the layout component
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import LoansAndAdvancements from "./pages/LoansAndAdvancements";
import Savings from "./pages/Savings";
import VacationAbsence from "./pages/VacationAbsence";
import Analytics from "./pages/Analytics";
import Timesheet from "./pages/Timesheet";
import NotFound from "./pages/NotFound";
import PayslipOverviewPage from "./pages/payslips/PayslipOverviewPage"; // Import the new overview page
import Irp5ExportPage from "./pages/payslips/Irp5ExportPage"; // Import the new IRP5 export page

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
            <Route path="/timesheet" element={<Timesheet />} />
            {/* Updated Payslips route to use the layout component */}
            <Route path="/payslips/*" element={<Payslips />} />
            <Route path="/loans-advancements" element={<LoansAndAdvancements />} />
            <Route path="/savings" element={<Savings />} />
            <Route path="/vacation-absence" element={<VacationAbsence />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/reports" element={<Reports />} />
            
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