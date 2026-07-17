"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { showError, showSuccess } from "@/utils/toast";

export default function AccountProfileSection() {
  const { user, refreshAuth } = useAuth();

  const [savingAccount, setSavingAccount] = React.useState(false);
  const [name, setName] = React.useState<string>(user?.name ?? "");

  React.useEffect(() => {
    setName(user?.name ?? "");
  }, [user?.name]);

  const onSaveAccount = async () => {
    if (!user) return;
    const nextName = name.trim();
    if (!nextName) {
      showError("Name cannot be empty.");
      return;
    }

    setSavingAccount(true);
    try {
      // Update public.users (RLS allows user to update their own profile)
      const { error: userTableErr } = await supabase
        .from("users")
        .update({ name: nextName, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (userTableErr) {
        showError("Failed to save your account details.");
        return;
      }

      // Best-effort sync auth metadata
      await supabase.auth.updateUser({ data: { name: nextName } });

      await refreshAuth({ silent: true, force: true });
      showSuccess("Account details updated.");
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to save your account details.");
    } finally {
      setSavingAccount(false);
    }
  };

  const [savingPassword, setSavingPassword] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const onChangePassword = async () => {
    if (!user) return;

    if (newPassword.length < 8) {
      showError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showError("Passwords do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        showError(error.message);
        return;
      }
      setNewPassword("");
      setConfirmPassword("");
      showSuccess("Password updated.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <Card className="rounded-xl border bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Account</CardTitle>
        <CardDescription>Update your display name and password.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="account_name">Display name</Label>
            <Input id="account_name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="account_email">Email</Label>
            <Input id="account_email" value={user?.email ?? ""} disabled className="mt-1" />
          </div>
        </div>

        <Button onClick={onSaveAccount} disabled={savingAccount} className="w-full md:w-auto">
          {savingAccount ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save account details
        </Button>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="new_password">New password</Label>
            <Input id="new_password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="confirm_password">Confirm password</Label>
            <Input id="confirm_password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1" />
          </div>
        </div>

        <Button onClick={onChangePassword} disabled={savingPassword} variant="outline" className="w-full md:w-auto bg-white">
          {savingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Update password
        </Button>
      </CardContent>
    </Card>
  );
}
