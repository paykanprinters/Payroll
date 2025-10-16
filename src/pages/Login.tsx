"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react"; // For loading spinner
import { usePayrollProcessor } from "@/hooks/use-payroll-processor"; // Import usePayrollProcessor


const loginSchema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const { login, isAuthenticated, user, isLoadingAuth } = useAuth();
  const { companyDetails, isLoadingCompanyDetails, isMockDataEnabled } = usePayrollProcessor(); // Use usePayrollProcessor
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false); // Separate state for form submission

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    console.log("Login.tsx: companyDetails received:", companyDetails);
    console.log("Login.tsx: isLoadingCompanyDetails:", isLoadingCompanyDetails);
    console.log("Login.tsx: isMockDataEnabled:", isMockDataEnabled);
  }, [companyDetails, isLoadingCompanyDetails, isMockDataEnabled]);

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
    } catch (error) {
      // Error toast handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayCompanyName = companyDetails?.companyLegalName || companyDetails?.companyTradingName || "Your Company Name";
  const displayLogoUrl = companyDetails?.logoUrl;
  const displayLogoWidth = companyDetails?.logoWidth || 100;
  const displayLogoHeight = companyDetails?.logoHeight || 50;
  const displayLogoFit = companyDetails?.logoFit || "contain";

  // Show a full-page loader if authentication state or company details are still being determined
  if (isLoadingAuth || isLoadingCompanyDetails) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          {displayLogoUrl && (
            <img
              src={displayLogoUrl}
              alt="Company Logo"
              style={{ width: displayLogoWidth, height: displayLogoHeight, objectFit: displayLogoFit }}
              className="mx-auto"
            />
          )}
          <CardTitle className="text-3xl font-bold">
            {displayCompanyName}
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Welcome to {displayCompanyName} Payroll System
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                {...form.register("email")}
                className="mt-1"
              />
              {form.formState.errors.email && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="password"
                {...form.register("password")}
                className="mt-1"
              />
              {form.formState.errors.password && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              <a href="#" className="hover:underline">Forgot Password?</a>
            </div>
          </form>
        </CardContent>
        <div className="p-6 text-center text-sm text-muted-foreground border-t dark:border-gray-800">
          <p>© 2025 {displayCompanyName}</p>
          <div className="mt-2 space-x-4">
            <a href="#" className="hover:underline">Privacy Policy</a>
            <a href="#" className="hover:underline">Support</a>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Login;