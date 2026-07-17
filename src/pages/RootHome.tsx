"use client";

import React from "react";
import { useAuth } from "@/hooks/use-auth";
import StaffHome from "./StaffHome";
import Dashboard from "./Dashboard";

const RootHome: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === "Staff") {
    return <StaffHome />;
  }
  return <Dashboard />;
};

export default RootHome;