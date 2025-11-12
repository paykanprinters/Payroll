"use client";

import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Unauthorized: React.FC = () => {
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>You don’t have permission to view this page.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          If you believe this is a mistake, please contact an administrator to request access.
        </CardContent>
        <CardFooter className="flex justify-center gap-3">
          <Button asChild variant="secondary">
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Home</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Unauthorized;