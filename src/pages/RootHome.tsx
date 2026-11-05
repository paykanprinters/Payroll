"use client";

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import StaffHome from "./StaffHome";
import Dashboard from "./Dashboard";

const RootHome: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === "Staff") {
    return <StaffHome />;
  }
  if (user?.role === "Accountant") {
    return <Navigate to="/accountant" replace />;
  }
  return <Dashboard />;
};

export default RootHome;