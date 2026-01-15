"use client";

import React from "react";
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from "@/integrations/supabase/client";
import LogoBrand from "@/components/LogoBrand";

const Login: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-950 p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="flex flex-col items-center mb-6">
          <LogoBrand size="lg" align="center" showName />
          <div className="mt-2 text-sm text-muted-foreground text-center">
            Welcome back — please sign in to continue.
          </div>
        </div>
        <div className="rounded-xl border bg-white/70 dark:bg-gray-900/60 backdrop-blur p-4 shadow-sm">
          <Auth
            supabaseClient={supabase}
            providers={[]}
            appearance={{
              theme: ThemeSupa,
            }}
            theme="light"
          />
        </div>
      </div>
    </div>
  );
};

export default Login;