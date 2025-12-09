"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";

const UserControlPanel: React.FC = () => {
  const [email, setEmail] = useState("info@kanprinters.co.za");
  const [overrideToken, setOverrideToken] = useState("");

  const handlePromote = async () => {
    const toastId = showLoading("Promoting user...") as string;
    try {
      const { data, error } = await supabase.functions.invoke("promote-user-to-admin", {
        body: { email, override_token: overrideToken || undefined }
      });
      if (error) {
        showError(error.message || "Failed to promote user");
        return;
      }
      if (data?.error) {
        showError(data.error);
        return;
      }
      showSuccess("User promoted to Admin successfully");
      // Optional: refresh session-derived role by reloading
      window.location.reload();
    } catch (e: any) {
      showError(e.message || "Unexpected error");
    } finally {
      dismissToast(toastId);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Control Panel</CardTitle>
          <CardDescription>Repair roles and access. Use the override token only when there are no Admins left.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">User Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="token">Override Token (only if no Admins exist)</Label>
            <Input id="token" value={overrideToken} onChange={(e) => setOverrideToken(e.target.value)} placeholder="Leave empty if an Admin exists" />
          </div>
          <Button onClick={handlePromote}>Promote to Admin</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserControlPanel;