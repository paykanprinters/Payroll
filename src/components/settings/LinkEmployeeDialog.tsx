"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { MockEmployee } from "@/lib/mock-data-interfaces";
import { Loader2, Link as LinkIcon, Unlink } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: { id: string; email: string; name: string } | null;
  employees: MockEmployee[];
  currentLinkedEmployeeId?: string | null;
  onLinkedChange?: (linkedEmployeeId: string | null) => void;
}

const LinkEmployeeDialog: React.FC<Props> = ({
  isOpen,
  onClose,
  user,
  employees,
  currentLinkedEmployeeId,
  onLinkedChange,
}) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string>(currentLinkedEmployeeId || "");
  const [portalAccess, setPortalAccess] = React.useState<boolean>(true);
  const [loading, setLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    setSelectedEmployeeId(currentLinkedEmployeeId || "");
    setPortalAccess(true);
  }, [currentLinkedEmployeeId, isOpen]);

  const handleLink = async () => {
    if (!user || !selectedEmployeeId) {
      showError("Select a user and an employee to link.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from("employees")
        .update({
          user_id: user.id,
          portal_access: portalAccess,
          email: user.email,
        })
        .eq("id", selectedEmployeeId);

      if (error) {
        console.error("LinkEmployeeDialog: link error", error);
        showError("Failed to link employee to user.");
      } else {
        showSuccess("Employee linked to user and portal access updated.");
        onLinkedChange?.(selectedEmployeeId);
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (!currentLinkedEmployeeId) {
      showError("No linked employee to unlink.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from("employees")
        .update({
          user_id: null,
          portal_access: false,
        })
        .eq("id", currentLinkedEmployeeId);

      if (error) {
        console.error("LinkEmployeeDialog: unlink error", error);
        showError("Failed to unlink employee from user.");
      } else {
        showSuccess("Employee unlinked and portal access disabled.");
        onLinkedChange?.(null);
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Link Employee to User</DialogTitle>
        </DialogHeader>

        {!user ? (
          <div className="py-6 text-muted-foreground">No user selected.</div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>User</Label>
              <Input value={`${user.name} (${user.email})`} disabled />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="employee-select">Employee</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger id="employee-select">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.length > 0 ? (
                    employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.customEmployeeId})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No employees available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="portal-access">Portal Access</Label>
              <Select value={portalAccess ? "true" : "false"} onValueChange={(v) => setPortalAccess(v === "true")}>
                <SelectTrigger id="portal-access">
                  <SelectValue placeholder="Enable portal access" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Enabled — user can log in to view profile/payslips</SelectItem>
                  <SelectItem value="false">Disabled — no portal access</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          {currentLinkedEmployeeId ? (
            <Button variant="destructive" onClick={handleUnlink} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unlink className="mr-2 h-4 w-4" />}
              Unlink
            </Button>
          ) : null}
          <Button onClick={handleLink} disabled={loading || !selectedEmployeeId}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
            Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LinkEmployeeDialog;