import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./components/MainLayout"; // Import the new MainLayout
import Dashboard from "./pages/Dashboard"; // Import the renamed Dashboard
import Employees from "./pages/Employees";
import Payslips from "./pages/Payslips";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <MainLayout> {/* Wrap routes with MainLayout */}
          <Routes>
            <Route path="/" element={<Dashboard />} /> {/* Default route to Dashboard */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/payslips" element={<Payslips />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;