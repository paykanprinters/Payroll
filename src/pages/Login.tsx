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
import { ThemeSupa } from "@supabase/auth-ui-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function Login() {
  // Other code here
  return (
    <div
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: "url('/graffit.png')" }}
    >
      <div className="absolute inset-0 bg-black/35" />
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md rounded-xl bg-white/85 backdrop-blur-md shadow-lg p-6">
          <Auth
            supabaseClient={supabase}
            providers={[]}
            appearance={{
              theme: ThemeSupa,
              className: {
                input: "bg-white/80",
                button: "bg-primary hover:bg-primary/90",
              },
            }}
            theme="light"
          />
        </div>
      </div>
    </div>
  );
}

export default Login;