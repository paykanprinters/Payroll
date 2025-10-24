"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const DashboardQuickActionsCard: React.FC = () => {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="flex items-center space-x-2">
          <Button asChild className="w-full">
            <Link to="/employees">Add New Employee</Link>
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Button asChild className="w-full">
            <Link to="/payslips/overview">Generate Payslips</Link>
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Button asChild className="w-full">
            <Link to="/reports">View Reports</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardQuickActionsCard;