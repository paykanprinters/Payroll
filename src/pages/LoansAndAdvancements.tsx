"use client";

import React, { useMemo, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import PayrollAdminHeader from "@/components/payroll/PayrollAdminHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, DollarSign, PauseCircle, PlayCircle, Trash2, Snowflake } from "lucide-react";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import { showError } from "@/utils/toast";
import type { Loan } from "@/lib/mock-data-interfaces";

const loanSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  loanType: z.enum(["Personal", "Emergency", "Education", "Other"]),
  loanAmount: z.coerce.number().positive("Loan amount must be positive"),
  repaymentAmount: z.coerce.number().positive("Repayment amount must be positive"),
  frequency: z.enum(["monthly", "weekly"]),
  startDate: z.date({ required_error: "Start date is required" }),
  notes: z.string().optional(),
});

type LoanFormValues = z.infer<typeof loanSchema>;

const LoansAndAdvancements: React.FC = () => {
  const {
    employees,
    loans,
    addLoan,
    updateLoan,
    togglePauseDeduction,
    applyManualPayment,
    deleteLoan,
    isLoadingEmployees,
    isLoadingLoans,
  } = usePayrollProcessor();

  const getEmployeeName = (employeeId: string) => {
    const e = employees.find((x) => x.id === employeeId);
    return e ? `${e.firstName} ${e.lastName}` : "Unknown";
  };

  const getEmployeeLabel = (employeeId: string) => {
    const e = employees.find((x) => x.id === employeeId);
    if (!e) return "Unknown";
    return `${e.firstName} ${e.lastName}${e.customEmployeeId ? ` • ${e.customEmployeeId}` : ""}`;
  };

  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      employeeId: "",
      loanType: "Personal",
      loanAmount: 0,
      repaymentAmount: 0,
      frequency: "monthly",
      startDate: undefined,
      notes: "",
    },
  });

  const [employeeFilterId, setEmployeeFilterId] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filteredLoans = useMemo(() => {
    const q = search.trim().toLowerCase();
    return loans
      .filter((l) => (employeeFilterId === "all" ? true : l.employeeId === employeeFilterId))
      .filter((l) => {
        if (!q) return true;
        const employee = getEmployeeLabel(l.employeeId).toLowerCase();
        return (
          employee.includes(q) ||
          l.loanType.toLowerCase().includes(q) ||
          (l.status || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
  }, [loans, employeeFilterId, search, employees]);

  const totals = useMemo(() => {
    const totalPrincipal = loans.reduce((s, l) => s + Number(l.loanAmount || 0), 0);
    const totalRemaining = loans.reduce((s, l) => s + Number(l.remainingBalance || 0), 0);
    const active = loans.filter((l) => l.status === "active").length;
    const paused = loans.filter((l) => l.paused).length;
    return { totalPrincipal, totalRemaining, active, paused };
  }, [loans]);

  const startDate = form.watch("startDate");

  const onSubmit = async (values: LoanFormValues) => {
    const newLoan: Omit<Loan, "id" | "status" | "remainingBalance" | "deductionHistory" | "paused"> = {
      employeeId: values.employeeId,
      loanType: values.loanType,
      loanAmount: values.loanAmount,
      repaymentAmount: values.repaymentAmount,
      frequency: values.frequency,
      startDate: format(values.startDate, "yyyy-MM-dd"),
      notes: values.notes,
    };

    await addLoan(newLoan as any);

    form.reset({
      employeeId: "",
      loanType: "Personal",
      loanAmount: 0,
      repaymentAmount: 0,
      frequency: "monthly",
      startDate: undefined,
      notes: "",
    });
  };

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentLoanId, setPaymentLoanId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentNotes, setPaymentNotes] = useState<string>("");

  const paymentLoan = useMemo(
    () => (paymentLoanId ? loans.find((l) => l.id === paymentLoanId) ?? null : null),
    [paymentLoanId, loans]
  );

  const [freezeDialogOpen, setFreezeDialogOpen] = useState(false);
  const [freezeLoanId, setFreezeLoanId] = useState<string | null>(null);
  const [freezeMode, setFreezeMode] = useState<"range" | "cycles">("range");
  const [freezeStart, setFreezeStart] = useState<Date | undefined>(undefined);
  const [freezeEnd, setFreezeEnd] = useState<Date | undefined>(undefined);
  const [freezeCycles, setFreezeCycles] = useState<string>("1");

  const freezeLoan = useMemo(
    () => (freezeLoanId ? loans.find((l) => l.id === freezeLoanId) ?? null : null),
    [freezeLoanId, loans]
  );

  const openFreeze = (loanId: string) => {
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) return;
    setFreezeLoanId(loanId);
    const initialMode = (loan.freezeMode as any) || "range";
    setFreezeMode(initialMode === "cycles" ? "cycles" : "range");
    setFreezeStart(loan.freezeStartDate ? new Date(loan.freezeStartDate) : undefined);
    setFreezeEnd(loan.freezeEndDate ? new Date(loan.freezeEndDate) : undefined);
    setFreezeCycles(String(loan.freezeCyclesRemaining ?? 1));
    setFreezeDialogOpen(true);
  };

  const confirmFreeze = async () => {
    if (!freezeLoan) return;

    if (freezeMode === "range") {
      if (!freezeStart || !freezeEnd) {
        showError("Select a start and end date.");
        return;
      }
      if (freezeEnd < freezeStart) {
        showError("End date cannot be before start date.");
        return;
      }

      await updateLoan({
        ...freezeLoan,
        freezeMode: "range",
        freezeStartDate: format(freezeStart, "yyyy-MM-dd"),
        freezeEndDate: format(freezeEnd, "yyyy-MM-dd"),
        freezeCyclesRemaining: null,
        paused: false,
      });
    } else {
      const n = Number(freezeCycles);
      if (!Number.isFinite(n) || n <= 0) {
        showError("Enter a valid number of payroll cycles.");
        return;
      }

      await updateLoan({
        ...freezeLoan,
        freezeMode: "cycles",
        freezeCyclesRemaining: Math.floor(n),
        freezeStartDate: null,
        freezeEndDate: null,
        paused: false,
      });
    }

    setFreezeDialogOpen(false);
  };

  const clearFreeze = async () => {
    if (!freezeLoan) return;
    await updateLoan({
      ...freezeLoan,
      freezeMode: null,
      freezeStartDate: null,
      freezeEndDate: null,
      freezeCyclesRemaining: null,
    });
    setFreezeDialogOpen(false);
  };

  const openManualPayment = (loanId: string) => {
    setPaymentLoanId(loanId);
    setPaymentAmount("");
    setPaymentNotes("");
    setPaymentDialogOpen(true);
  };

  const confirmManualPayment = async () => {
    if (!paymentLoan) return;
    const amt = Number(paymentAmount);
    if (!amt || amt <= 0) {
      showError("Enter a valid payment amount.");
      return;
    }
    if (amt > paymentLoan.remainingBalance) {
      showError("Payment cannot exceed remaining balance.");
      return;
    }
    await applyManualPayment(paymentLoan.id, amt, paymentNotes.trim() || undefined);
    setPaymentDialogOpen(false);
  };

  const isLoadingPage = isLoadingEmployees || isLoadingLoans;

  if (isLoadingPage) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading loans…</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PayrollAdminHeader
        title="Employee Loans"
        subtitle="Create and manage employee loans, repayments, and outstanding balances."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card className="relative overflow-hidden rounded-2xl border bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Create loan</CardTitle>
            <CardDescription>Loans are employee-specific and will be deducted during payroll runs.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Employee</Label>
                  <Select value={form.watch("employeeId")} onValueChange={(v) => form.setValue("employeeId", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.firstName} {e.lastName}{e.customEmployeeId ? ` • ${e.customEmployeeId}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.employeeId && (
                    <p className="text-xs text-red-600">{form.formState.errors.employeeId.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label>Loan type</Label>
                  <Select
                    value={form.watch("loanType")}
                    onValueChange={(v) => form.setValue("loanType", v as Loan["loanType"])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Personal">Personal</SelectItem>
                      <SelectItem value="Emergency">Emergency</SelectItem>
                      <SelectItem value="Education">Education</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Principal amount (R)</Label>
                  <Input type="number" step="0.01" {...form.register("loanAmount")} />
                  {form.formState.errors.loanAmount && (
                    <p className="text-xs text-red-600">{form.formState.errors.loanAmount.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label>Deduction per cycle (R)</Label>
                  <Input type="number" step="0.01" {...form.register("repaymentAmount")} />
                  {form.formState.errors.repaymentAmount && (
                    <p className="text-xs text-red-600">{form.formState.errors.repaymentAmount.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label>Deduction frequency</Label>
                  <Select
                    value={form.watch("frequency")}
                    onValueChange={(v) => form.setValue("frequency", v as Loan["frequency"])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>First deduction date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(d) => d && form.setValue("startDate", d)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {form.formState.errors.startDate && (
                    <p className="text-xs text-red-600">{form.formState.errors.startDate.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={form.watch("notes") || ""}
                  onChange={(e) => form.setValue("notes", e.target.value)}
                  placeholder="e.g., reason, terms, or repayment notes"
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit">
                  <DollarSign className="h-4 w-4" />
                  Save loan
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-3">
          <Card className="rounded-2xl border bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Overview</CardTitle>
              <CardDescription>High-level totals across all loans.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border bg-background p-4">
                <div className="text-xs text-muted-foreground">Total principal</div>
                <div className="mt-1 text-lg font-semibold">R {totals.totalPrincipal.toFixed(2)}</div>
              </div>
              <div className="rounded-2xl border bg-background p-4">
                <div className="text-xs text-muted-foreground">Total remaining</div>
                <div className="mt-1 text-lg font-semibold">R {totals.totalRemaining.toFixed(2)}</div>
              </div>
              <div className="rounded-2xl border bg-background p-4">
                <div className="text-xs text-muted-foreground">Active loans</div>
                <div className="mt-1 text-lg font-semibold">{totals.active}</div>
              </div>
              <div className="rounded-2xl border bg-background p-4">
                <div className="text-xs text-muted-foreground">Paused deductions</div>
                <div className="mt-1 text-lg font-semibold">{totals.paused}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Filters</CardTitle>
              <CardDescription>Find a loan quickly.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="space-y-1">
                <Label>Employee</Label>
                <Select value={employeeFilterId} onValueChange={setEmployeeFilterId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All employees</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.firstName} {e.lastName}{e.customEmployeeId ? ` • ${e.customEmployeeId}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Search</Label>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by employee, type, status…"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="rounded-2xl border bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Existing loans</CardTitle>
          <CardDescription>Pause deductions, record manual payments, or remove loans.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border bg-white overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Principal</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="text-right">Deduction</TableHead>
                  <TableHead>Freq</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLoans.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{getEmployeeLabel(l.employeeId)}</TableCell>
                    <TableCell>{l.loanType}</TableCell>
                    <TableCell className="text-right">R {Number(l.loanAmount).toFixed(2)}</TableCell>
                    <TableCell className="text-right">R {Number(l.remainingBalance).toFixed(2)}</TableCell>
                    <TableCell className="text-right">R {Number(l.repaymentAmount).toFixed(2)}</TableCell>
                    <TableCell className="uppercase text-xs">{l.frequency}</TableCell>
                    <TableCell className="font-mono text-xs">{l.startDate}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={cn(l.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-background")}
                        >
                          {l.status}
                        </Badge>
                        {l.freezeMode && (
                          <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                            frozen
                          </Badge>
                        )}
                        {l.paused && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            paused
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openFreeze(l.id)}
                          disabled={l.status === "completed"}
                        >
                          <Snowflake className="h-4 w-4" />
                          Freeze
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => togglePauseDeduction(l.id, l.paused)}
                          disabled={l.status === "completed"}
                        >
                          {l.paused ? <PlayCircle className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
                          {l.paused ? "Resume" : "Pause"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openManualPayment(l.id)}
                          disabled={l.status === "completed"}
                        >
                          <DollarSign className="h-4 w-4" />
                          Payment
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                              Remove
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove this loan?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This permanently removes the loan record. This does not affect previous payslips.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteLoan(l.id)}>
                                Remove loan
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLoans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No loans found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={freezeDialogOpen} onOpenChange={setFreezeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Freeze loan deductions</DialogTitle>
            <DialogDescription>
              {freezeLoan ? `${getEmployeeName(freezeLoan.employeeId)} • Remaining: R ${Number(freezeLoan.remainingBalance).toFixed(2)}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-1">
              <Label>Freeze type</Label>
              <Select value={freezeMode} onValueChange={(v) => setFreezeMode(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="range">Date range</SelectItem>
                  <SelectItem value="cycles">Number of payroll cycles</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {freezeMode === "range" ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Start date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !freezeStart && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {freezeStart ? format(freezeStart, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={freezeStart} onSelect={setFreezeStart} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1">
                  <Label>End date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !freezeEnd && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {freezeEnd ? format(freezeEnd, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={freezeEnd} onSelect={setFreezeEnd} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <Label>Payroll cycles to freeze</Label>
                <Input value={freezeCycles} onChange={(e) => setFreezeCycles(e.target.value)} type="number" min={1} step={1} />
                <p className="text-xs text-muted-foreground">
                  This will skip deductions for the next N payroll runs for this employee.
                </p>
              </div>
            )}

            {freezeLoan?.freezeMode && (
              <Button variant="outline" onClick={clearFreeze}>
                Clear freeze
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFreezeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmFreeze}>
              <Snowflake className="h-4 w-4" />
              Save freeze
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record manual payment</DialogTitle>
            <DialogDescription>
              {paymentLoan ? `${getEmployeeName(paymentLoan.employeeId)} • Remaining: R ${Number(paymentLoan.remainingBalance).toFixed(2)}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>Amount (R)</Label>
              <Input value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} type="number" step="0.01" />
            </div>
            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Textarea value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} placeholder="e.g., cash payment, early settlement" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmManualPayment}>
              <DollarSign className="h-4 w-4" />
              Save payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoansAndAdvancements;