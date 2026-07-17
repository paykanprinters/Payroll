"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { showSuccess, showError } from "@/utils/toast";
import {
  fetchEarningComponents,
  fetchDeductionComponents,
  upsertEarningComponent,
  upsertDeductionComponent,
  deleteEarningComponent,
  deleteDeductionComponent,
  EarningComponent,
  DeductionComponent,
  AmountType,
} from "@/integrations/supabase/compensation-queries";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import PayrollAdminHeader from "@/components/payroll/PayrollAdminHeader";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import { Plus, Trash2 } from "lucide-react";

const CompensationComponentsPage: React.FC = () => {
  const [earnings, setEarnings] = useState<EarningComponent[]>([]);
  const [deductions, setDeductions] = useState<DeductionComponent[]>([]);

  // Form state
  const [eForm, setEForm] = useState<Partial<EarningComponent>>({
    amountType: "fixed",
    taxable: true,
    amount: 0,
  });
  const [dForm, setDForm] = useState<Partial<DeductionComponent>>({
    amountType: "fixed",
    preTax: false,
    amount: 0,
  });

  const refresh = async () => {
    setEarnings(await fetchEarningComponents());
    setDeductions(await fetchDeductionComponents());
  };

  useEffect(() => {
    refresh();
  }, []);

  const saveEarning = async () => {
    if (!eForm.name || eForm.amount === undefined) {
      showError("Name and amount are required for earnings.");
      return;
    }
    const saved = await upsertEarningComponent(eForm);
    if (saved) {
      showSuccess("Earning component saved.");
      setEForm({ amountType: "fixed", taxable: true, amount: 0 });
      refresh();
    }
  };

  const saveDeduction = async () => {
    if (!dForm.name || dForm.amount === undefined) {
      showError("Name and amount are required for deductions.");
      return;
    }
    const saved = await upsertDeductionComponent(dForm);
    if (saved) {
      showSuccess("Deduction component saved.");
      setDForm({ amountType: "fixed", preTax: false, amount: 0 });
      refresh();
    }
  };

  return (
    <div className="space-y-4">
      <PayrollAdminHeader
        title="Compensation Components"
        subtitle="Define reusable earnings and deductions used across payroll runs."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="relative overflow-hidden rounded-2xl border bg-white shadow-sm">
          <SummaryAccent variant="emerald" />
          <CardHeader>
            <CardTitle className="text-xl">Create earning component</CardTitle>
            <CardDescription>Reusable additions to gross pay (e.g., allowance, bonus).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input
                  placeholder="e.g. Transport Allowance"
                  value={eForm.name || ""}
                  onChange={(e) => setEForm({ ...eForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Code (optional)</Label>
                <Input
                  placeholder="e.g. TRN"
                  value={eForm.code || ""}
                  onChange={(e) => setEForm({ ...eForm, code: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label>Amount type</Label>
                <Select value={eForm.amountType as string} onValueChange={(v) => setEForm({ ...eForm, amountType: v as AmountType })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Amount Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="percent_of_salary">Percent of Salary</SelectItem>
                    <SelectItem value="percent_of_hourly">Percent of Hourly Rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Amount</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={eForm.amount ?? 0}
                  onChange={(e) => setEForm({ ...eForm, amount: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1">
                <Label>Effective start</Label>
                <Input type="date" value={eForm.effectiveStart || ""} onChange={(e) => setEForm({ ...eForm, effectiveStart: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Effective end</Label>
                <Input type="date" value={eForm.effectiveEnd || ""} onChange={(e) => setEForm({ ...eForm, effectiveEnd: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border bg-background p-3">
              <div>
                <div className="text-sm font-medium">Taxable</div>
                <div className="text-xs text-muted-foreground">Include in taxable income where applicable.</div>
              </div>
              <Checkbox
                checked={eForm.taxable ?? true}
                onCheckedChange={(v) => setEForm({ ...eForm, taxable: Boolean(v) })}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={saveEarning}>
                <Plus className="h-4 w-4" />
                Save earning
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden rounded-2xl border bg-white shadow-sm">
          <SummaryAccent variant="rose" />
          <CardHeader>
            <CardTitle className="text-xl">Create deduction component</CardTitle>
            <CardDescription>Reusable deductions (e.g., benefit, garnishee, savings).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input
                  placeholder="e.g. Medical Aid"
                  value={dForm.name || ""}
                  onChange={(e) => setDForm({ ...dForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Code (optional)</Label>
                <Input
                  placeholder="e.g. MED"
                  value={dForm.code || ""}
                  onChange={(e) => setDForm({ ...dForm, code: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label>Amount type</Label>
                <Select value={dForm.amountType as string} onValueChange={(v) => setDForm({ ...dForm, amountType: v as AmountType })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Amount Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="percent_of_salary">Percent of Salary</SelectItem>
                    <SelectItem value="percent_of_hourly">Percent of Hourly Rate</SelectItem>
                    <SelectItem value="percent_of_gross">Percent of Gross</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Amount</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={dForm.amount ?? 0}
                  onChange={(e) => setDForm({ ...dForm, amount: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1">
                <Label>Effective start</Label>
                <Input type="date" value={dForm.effectiveStart || ""} onChange={(e) => setDForm({ ...dForm, effectiveStart: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Effective end</Label>
                <Input type="date" value={dForm.effectiveEnd || ""} onChange={(e) => setDForm({ ...dForm, effectiveEnd: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border bg-background p-3">
              <div>
                <div className="text-sm font-medium">Pre-tax</div>
                <div className="text-xs text-muted-foreground">Deduct before PAYE where applicable.</div>
              </div>
              <Checkbox
                checked={dForm.preTax ?? false}
                onCheckedChange={(v) => setDForm({ ...dForm, preTax: Boolean(v) })}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={saveDeduction}>
                <Plus className="h-4 w-4" />
                Save deduction
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Existing components</CardTitle>
          <CardDescription>Review and remove components when they are no longer used.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Earnings</div>
                <Badge variant="outline" className="bg-background">{earnings.length}</Badge>
              </div>
              <div className="rounded-2xl border bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Taxable</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {earnings.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.name}</TableCell>
                        <TableCell>
                          {e.amount} <span className="text-xs text-muted-foreground">({e.amountType})</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={e.taxable ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-muted"}>
                            {e.taxable ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              await deleteEarningComponent(e.id);
                              showSuccess("Deleted");
                              refresh();
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {earnings.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No earnings
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Deductions</div>
                <Badge variant="outline" className="bg-background">{deductions.length}</Badge>
              </div>
              <div className="rounded-2xl border bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Pre-tax</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deductions.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell>
                          {d.amount} <span className="text-xs text-muted-foreground">({d.amountType})</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={d.preTax ? "bg-sky-50 text-sky-700 border-sky-200" : "bg-muted"}>
                            {d.preTax ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              await deleteDeductionComponent(d.id);
                              showSuccess("Deleted");
                              refresh();
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {deductions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No deductions
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <Separator />

          <div className="text-xs text-muted-foreground">
            Tip: Use Assignments to attach components to employees for a specific effective date range.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompensationComponentsPage;