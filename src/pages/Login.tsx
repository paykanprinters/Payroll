"use client";

import React from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import AuthLayout from "@/components/auth/AuthLayout";

const Login: React.FC = () => {
  return (
    <AuthLayout title="Sign in to Admin Console" subtitle="Admin & Manager access">
      <Auth
        supabaseClient={supabase}
        providers={[]}
        appearance={{ theme: ThemeSupa }}
        theme="light"
      />
    </AuthLayout>
  );
};

export default Login;