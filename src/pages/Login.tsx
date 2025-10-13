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

const loginSchema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [companyLegalName, setCompanyLegalName] = useState<string>("");
  const [companyTradingName, setCompanyTradingName] = useState<string>("");
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [companyLogoWidth, setCompanyLogoWidth] = useState<number>(100);
  const [companyLogoHeight, setCompanyLogoHeight] = useState<number>(50);
  const [companyLogoFit, setCompanyLogoFit] = useState<"contain" | "cover" | "fill" | "none" | "scale-down">("contain");

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    const loadCompanyDetails = () => {
      const tradingName = localStorage.getItem('companyTradingName');
      const legalName = localStorage.getItem('companyLegalName');
      setCompanyTradingName(tradingName && tradingName.trim() !== '' ? tradingName : "");
      setCompanyLegalName(legalName && legalName.trim() !== '' ? legalName : "");
      setCompanyLogoUrl(localStorage.getItem('companyLogoUrl'));
      setCompanyLogoWidth(parseFloat(localStorage.getItem('companyLogoWidth') || '100'));
      setCompanyLogoHeight(parseFloat(localStorage.getItem('companyLogoHeight') || '50'));
      setCompanyLogoFit((localStorage.getItem('companyLogoFit') as "contain" | "cover" | "fill" | "none" | "scale-down") || "contain");
    };

    loadCompanyDetails();
    window.addEventListener('companyDetailsUpdated', loadCompanyDetails);
    window.addEventListener('mockDataUpdated', loadCompanyDetails); // Also listen for mock data changes
    return () => {
      window.removeEventListener('companyDetailsUpdated', loadCompanyDetails);
      window.removeEventListener('mockDataUpdated', loadCompanyDetails);
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect based on role (simplified for now, all go to dashboard)
      // In a real app, you'd have more granular redirection logic here
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      // Redirection handled by useEffect
    } catch (error) {
      console.error("Login failed:", error);
      // Error toast handled by AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  const displayCompanyName = companyLegalName || companyTradingName || "Your Company Name";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          {companyLogoUrl && (
            <img
              src={companyLogoUrl}
              alt="Company Logo"
              style={{ width: companyLogoWidth, height: companyLogoHeight, objectFit: companyLogoFit }}
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
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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