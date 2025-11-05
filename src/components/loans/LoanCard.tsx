"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { History, PauseCircle, PlayCircle, DollarSign, XCircle } from "lucide-react";
import { Loan } from "@/lib/mock-data-interfaces";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LoanCardProps {
  loan: Loan;
  getEmployeeName: (employeeId: string) => string;
  getEmployeeCustomId: (employeeId: string) => string; // New prop
  togglePauseDeduction: (loanId: string, currentStatus: boolean) => void;
  applyManualPayment: (loanId: string, amount: number, notes?: string) => void;
  deleteLoan: (loanId: string) => void;
}

const LoanCard: React.FC<LoanCardProps> = ({ loan, getEmployeeName, getEmployeeCustomId, togglePauseDeduction, applyManualPayment, deleteLoan }) => {
  const [manualPaymentAmount, setManualPaymentAmount] = useState<string>("");
  const [manualPaymentNotes, setManualPaymentNotes] = useState<string>("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const handleTogglePause = () => {
    togglePauseDeduction(loan.id, loan.paused);
  };

  const handleApplyManualPayment = () => {
    const amount = parseFloat(manualPaymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid positive amount for manual payment.");
      return;
    }
    if (amount > loan.remainingBalance) {
      alert("Manual payment cannot exceed remaining balance.");
      return;
    }
    applyManualPayment(loan.id, amount, manualPaymentNotes);
    setManualPaymentAmount("");
    setManualPaymentNotes("");
  };

  const handleDeleteLoan = () => {
    deleteLoan(loan.id);
  };

  const getStatusBadge = (status: Loan["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      default:
        return null;
    }
  };

  const getLoanTypeBadge = (type: Loan["loanType"]) => {
    switch (type) {
      case "Personal":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Personal</Badge>;
      case "Emergency":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Emergency</Badge>;
      case "Education":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Education</Badge>;
      case "Other":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Other</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg font-semibold">{getEmployeeName(loan.employeeId)}</CardTitle>
          {getStatusBadge(loan.status)}
          {loan.paused && <Badge variant="destructive" className="bg-yellow-500 text-yellow-900">Paused</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {getLoanTypeBadge(loan.loanType)}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon" className="h-8 w-8">
                <XCircle className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the loan record for{" "}
                  <span className="font-semibold">{getEmployeeName(loan.employeeId)}</span>.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteLoan} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete Loan
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <CardDescription className="text-sm text-muted-foreground">
          {loan.notes || "No specific notes for this loan."}
        </CardDescription>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <p><span className="font-semibold">Original Amount:</span> R {loan.loanAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
          <p><span className="font-semibold">Remaining Balance:</span> R {loan.remainingBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
          <p><span className="font-semibold">Deduction:</span> R {loan.repaymentAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })} ({loan.frequency})</p>
          <p><span className="font-semibold">Start Date:</span> {loan.startDate}</p>
        </div>

        <Separator />

        {/* Deduction Controls */}
        <div className="space-y-3">
          <h4 className="text-md font-semibold">Deduction Controls</h4>
          <div className="flex gap-2">
            <Button
              variant={loan.paused ? "default" : "outline"}
              onClick={handleTogglePause}
              disabled={loan.status === "completed"}
              className="flex-1"
            >
              {loan.paused ? <PlayCircle className="mr-2 h-4 w-4" /> : <PauseCircle className="mr-2 h-4 w-4" />}
              {loan.paused ? "Resume Deduction" : "Pause Deduction"}
            </Button>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label htmlFor="manualPayment">Manual Payment (R)</Label>
              <Input
                id="manualPayment"
                type="number"
                step="0.01"
                value={manualPaymentAmount}
                onChange={(e) => setManualPaymentAmount(e.target.value)}
                disabled={loan.status === "completed"}
                className="mt-1"
              />
            </div>
            <Button onClick={handleApplyManualPayment} disabled={loan.status === "completed" || parseFloat(manualPaymentAmount) <= 0}>
              <DollarSign className="mr-2 h-4 w-4" /> Apply
            </Button>
          </div>
          {manualPaymentAmount && parseFloat(manualPaymentAmount) > 0 && (
            <div>
              <Label htmlFor="manualPaymentNotes">Payment Notes (Optional)</Label>
              <Textarea
                id="manualPaymentNotes"
                value={manualPaymentNotes}
                onChange={(e) => setManualPaymentNotes(e.target.value)}
                placeholder="e.g., Cash payment, early settlement"
                className="mt-1"
              />
            </div>
          )}
        </div>

        <Separator />

        {/* Deduction History */}
        <div className="space-y-3">
          <h4 className="text-md font-semibold flex items-center justify-between">
            Deduction History
            <Button variant="ghost" size="icon" onClick={() => setIsHistoryOpen(!isHistoryOpen)}>
              <History className="h-4 w-4" />
            </Button>
          </h4>
          {isHistoryOpen && (
            <ScrollArea className="h-40 w-full rounded-md border p-4">
              {loan.deductionHistory.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {loan.deductionHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((entry, index) => (
                    <li key={index} className="flex justify-between items-center">
                      <span className="font-medium">{format(new Date(entry.date), "PPP")}</span>
                      <span className="flex-1 ml-2 text-muted-foreground truncate">{entry.notes || entry.type}</span>
                      {entry.amount > 0 ? (
                        <span className="font-semibold text-green-600">R {entry.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
                      ) : (
                        <Badge variant="outline" className="text-xs">{entry.type}</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-muted-foreground">No deduction history yet.</p>
              )}
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LoanCard;