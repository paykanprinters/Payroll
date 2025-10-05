"use client";

import React from "react";
import { Outlet, Link, useLocation, Navigate, Routes, Route } from "react-router-dom";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator"; // Removed the extra '1'
import PayslipOverviewPage from "./payslips/PayslipOverviewPage";
import Irp5ExportPage from "./payslips/Irp5ExportPage";

const payslipsNavItems = [
  {
    title: "Payslip Overview",
    href: "/payslips/overview",
  },
  {
    title: "IRP5 Export",
    href: "/payslips/irp5-export",
  },
];

const PayslipsLayout: React.FC = () => {
  const location = useLocation();
  console.log("PayslipsLayout rendered. Current path:", location.pathname);
  console.log("Payslips nav items:", payslipsNavItems);

  return (
    <div className="space-y-6 p-4 pb-16 md:block">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">Payslips</h2>
      </div>
      <Separator className="my-6" />
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="-mx-4 lg:w-1/5">
          <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
            {payslipsNavItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  location.pathname === item.href
                    ? "bg-muted hover:bg-muted"
                    : "hover:bg-transparent hover:underline",
                  "justify-start"
                )}
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="flex-1 lg:max-w-full">
          <Outlet /> {/* This is where nested routes will render */}
        </div>
      </div>
    </div>
  );
};

const Payslips: React.FC = () => {
  console.log("Payslips component rendered.");
  return (
    <Routes>
      <Route path="/" element={<PayslipsLayout />}>
        {/* Default route for /payslips, redirects to /payslips/overview */}
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<PayslipOverviewPage />} />
        <Route path="irp5-export" element={<Irp5ExportPage />} />
        {/* Add more payslips sub-routes here */}
      </Route>
    </Routes>
  );
};

export default Payslips;