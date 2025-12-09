"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";

type UserRow = {
  id: string;
  email: string;
  role: "Admin" | "Manager" | "Staff" | string | null;
  status?: string | null;
  created_at?: string | null;
};

const UserControlPanel: React.FC = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [overrideToken, setOverrideToken] = useState("");
  const [bootstrapEmail, setBootstrapEmail] = useState("info@kanprinters.co.za");
  const adminCount = useMemo(() => users.filter(u => u.role === "Admin").length, [users]);
  const noAdmins = adminCount === 0;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const payload = noAdmins ? { override_token: overrideToken || undefined } : undefined;
      const { data, error } = await supabase.functions.invoke("list-users", { body: payload });
      if (error) {
        showError(error.message || "Failed to load users");
        return;
      }
      if (data?.error) {
        showError(data.error);
        return;
      }
      const list = (data?.users ?? []) as UserRow[];
      setUsers(list);
    } catch (e: any) {
      showError(e.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }, [overrideToken, noAdmins]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSetRole = async (userId: string, role: "Admin" | "Manager" | "Staff") => {
    const toastId = showLoading("Updating role...") as string;
    try {
      const body: any = { target_user_id: userId, role };
      if (noAdmins && overrideToken) body.override_token = overrideToken;
      const { data, error } = await supabase.functions.invoke("set-user-role", { body });
      if (error) {
        showError(error.message || "Failed to set role");
        return;
      }
      if (data?.error) {
        showError(data.error);
        return;
      }
      showSuccess("Role updated");
      await fetchUsers();
    } catch (e: any) {
      showError(e.message || "Unexpected error");
    } finally {
      dismissToast(toastId);
    }
  };

  const handleBootstrapAdmin = async () => {
    if (!bootstrapEmail) {
      showError("Enter an email to promote");
      return;
    }
    const toastId = showLoading("Bootstrapping admin...") as string;
    try {
      const { data, error } = await supabase.functions.invoke("promote-user-to-admin", {
        body: { email: bootstrapEmail, override_token: overrideToken || undefined }
      });
      if (error) {
        showError(error.message || "Failed to promote user");
        return;
      }
      if (data?.error) {
        showError(data.error);
        return;
      }
      showSuccess("User promoted to Admin");
      await fetchUsers();
      // Refresh local session/role detection
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
          <CardDescription>Manage roles and repair access. If there are no Admins, use the override token to bootstrap.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {noAdmins && (
            <div className="space-y-4 border rounded-md p-4 bg-yellow-50">
              <p className="text-sm text-yellow-800">
                No Admins detected. Use the override token (PROMOTE_OVERRIDE_TOKEN) to bootstrap an Admin.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label htmlFor="bootstrapEmail">Email to promote</Label>
                  <Input id="bootstrapEmail" type="email" value={bootstrapEmail} onChange={(e) => setBootstrapEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="override">Override Token</Label>
                  <Input id="override" value={overrideToken} onChange={(e) => setOverrideToken(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleBootstrapAdmin}>Promote to Admin</Button>
                <Button variant="outline" onClick={fetchUsers} disabled={loading}>Refresh</Button>
              </div>
            </div>
          )}

          {!noAdmins && (
            <>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Admins: {adminCount} • Users: {users.length}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={fetchUsers} disabled={loading}>Refresh</Button>
                </div>
              </div>

              <div className="space-y-2">
                {users.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No users found.</div>
                ) : (
                  users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-3 border rounded-md">
                      <div className="flex flex-col">
                        <span className="font-medium">{u.email}</span>
                        <span className="text-xs text-muted-foreground">{u.id}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-40">
                          <Label className="text-xs">Role</Label>
                          <Select
                            value={(u.role as any) ?? "Staff"}
                            onValueChange={(val) => handleSetRole(u.id, val as "Admin" | "Manager" | "Staff")}
                          >
                            <SelectTrigger className="h-8 mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Admin">Admin</SelectItem>
                              <SelectItem value="Manager">Manager</SelectItem>
                              <SelectItem value="Staff">Staff</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserControlPanel;