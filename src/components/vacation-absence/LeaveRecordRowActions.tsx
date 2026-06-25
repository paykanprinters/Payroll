"use client";

import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Pencil, Trash2, X } from "lucide-react";
import type { LeaveEntry } from "@/lib/mock-data-interfaces";
import { isPendingLeave } from "@/lib/leave-status";

interface LeaveRecordRowActionsProps {
  record: LeaveEntry;
  onEdit: (record: LeaveEntry) => void;
  onApprove: (id: string) => void | Promise<void>;
  onReject: (id: string, reason?: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  disabled?: boolean;
}

const LeaveRecordRowActions: React.FC<LeaveRecordRowActionsProps> = ({
  record,
  onEdit,
  onApprove,
  onReject,
  onDelete,
  disabled = false,
}) => {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEdit(record)}
          disabled={disabled}
          title="Edit leave record"
        >
          <Pencil className="h-4 w-4" />
        </Button>

        {isPendingLeave(record) && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-emerald-700 hover:text-emerald-800"
              onClick={() => onApprove(record.id)}
              disabled={disabled}
              title="Approve request"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setRejectOpen(true)}
              disabled={disabled}
              title="Reject request"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
          disabled={disabled}
          title="Delete leave record"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject leave request</AlertDialogTitle>
            <AlertDialogDescription>
              The employee will see this request as rejected. Add an optional note for payroll records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reject-reason">Reason (optional)</Label>
            <Input
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Insufficient leave balance"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void onReject(record.id, rejectReason);
                setRejectReason("");
              }}
            >
              Reject request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete leave record?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the leave entry. Approved leave already used in payroll should
              be corrected carefully.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void onDelete(record.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LeaveRecordRowActions;
