"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, LockKeyhole, ShieldCheck, Smartphone, FileSearch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import AuthLayout from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { accountantAccessState } from "@/lib/accountant-access";

type GateStep =
  | { kind: "checking" }
  | { kind: "ready" }
  | { kind: "enrol"; factorId: string; qrCode: string; secret: string }
  | { kind: "verify"; factorId: string }
  | { kind: "error"; message: string };

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Read-only access",
    description: "You can view and download payroll reports. Nothing can be changed from this login.",
  },
  {
    icon: Smartphone,
    title: "Two-step sign-in",
    description: "An authenticator app code is needed each time you sign in.",
  },
  {
    icon: FileSearch,
    title: "Every view is recorded",
    description: "Report views and downloads are written to the audit log.",
  },
];

const AccountantSecurityGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<GateStep>({ kind: "checking" });
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const accessState = user ? accountantAccessState(user) : "active";

  const prepare = useCallback(async () => {
    setStep({ kind: "checking" });
    const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError) {
      setStep({ kind: "error", message: aalError.message });
      return;
    }
    if (aal.currentLevel === "aal2") {
      setStep({ kind: "ready" });
      return;
    }

    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) {
      setStep({ kind: "error", message: factorsError.message });
      return;
    }

    const verified = factors.totp.find((f) => f.status === "verified");
    if (verified) {
      setStep({ kind: "verify", factorId: verified.id });
      return;
    }

    for (const stale of factors.all.filter((f) => f.status !== "verified")) {
      await supabase.auth.mfa.unenroll({ factorId: stale.id });
    }

    const { data: enrolled, error: enrolError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}`,
    });
    if (enrolError || !enrolled) {
      setStep({ kind: "error", message: enrolError?.message ?? "Could not start two-step setup." });
      return;
    }
    setStep({
      kind: "enrol",
      factorId: enrolled.id,
      qrCode: enrolled.totp.qr_code,
      secret: enrolled.totp.secret,
    });
  }, []);

  useEffect(() => {
    if (accessState === "active") void prepare();
  }, [accessState, prepare]);

  const submitCode = async (factorId: string) => {
    if (code.length !== 6) return;
    setIsSubmitting(true);
    setCodeError(null);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    setIsSubmitting(false);
    if (error) {
      setCode("");
      setCodeError("That code didn't match. Wait for the next code and try again.");
      return;
    }
    setStep({ kind: "ready" });
  };

  const signOut = () => {
    void supabase.auth.signOut();
  };

  if (accessState !== "active") {
    return (
      <AuthLayout
        title="Access has ended"
        subtitle={
          accessState === "expired"
            ? "The access period set for this login has passed."
            : "This login has been deactivated."
        }
        panelSubtitle="Accountant portal"
        features={FEATURES}
      >
        <div className="space-y-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <p>Ask the payroll administrator to extend or reactivate your access.</p>
          </div>
          <Button variant="outline" className="w-full" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (step.kind === "ready") return <>{children}</>;

  if (step.kind === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (step.kind === "error") {
    return (
      <AuthLayout
        title="Two-step sign-in unavailable"
        subtitle="Something went wrong while checking your sign-in."
        panelSubtitle="Accountant portal"
        features={FEATURES}
      >
        <div className="space-y-4 text-sm">
          <p className="text-destructive">{step.message}</p>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => void prepare()}>
              Try again
            </Button>
            <Button variant="outline" className="flex-1" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  const isEnrol = step.kind === "enrol";

  return (
    <AuthLayout
      title={isEnrol ? "Set up two-step sign-in" : "Enter your authenticator code"}
      subtitle={
        isEnrol
          ? "Scan the QR code with an authenticator app (Google Authenticator, Microsoft Authenticator or similar), then enter the 6-digit code it shows."
          : "Open your authenticator app and enter the 6-digit code for Kanprinters Payroll."
      }
      panelSubtitle="Accountant portal"
      features={FEATURES}
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submitCode(step.factorId);
        }}
      >
        {isEnrol && (
          <div className="space-y-3">
            <div className="flex justify-center rounded-xl border bg-white p-3">
              <img src={step.qrCode} alt="Authenticator QR code" className="h-44 w-44" />
            </div>
            <p className="text-xs text-muted-foreground">
              Can't scan? Enter this key in the app instead:
            </p>
            <code className="block break-all rounded-md bg-muted px-3 py-2 text-xs">{step.secret}</code>
          </div>
        )}

        <div className="flex justify-center">
          <InputOTP maxLength={6} value={code} onChange={setCode} autoFocus disabled={isSubmitting}>
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        {codeError && <p className="text-center text-sm text-destructive">{codeError}</p>}

        <Button type="submit" className="w-full" disabled={code.length !== 6 || isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEnrol ? "Confirm and continue" : "Verify"}
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={signOut}>
          Sign out
        </Button>
        {!isEnrol && (
          <p className="text-center text-xs text-muted-foreground">
            Lost your phone? Ask the payroll administrator to reset your two-step sign-in.
          </p>
        )}
      </form>
    </AuthLayout>
  );
};

export default AccountantSecurityGate;
