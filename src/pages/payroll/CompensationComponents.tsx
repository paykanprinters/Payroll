"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
} from "@/integrations/supabase/compensation-queries";

const CompensationComponentsPage: React.FC = () => {
  const [earnings, setEarnings] = useState<EarningComponent[]>([]);
  const [deductions, setDeductions] = useState<DeductionComponent[]>([]);

  // Form state
  const [eForm, setEForm] = useState<Partial<EarningComponent>>({ amountType: "fixed", taxable: true, amount: 0 });
  const [dForm, setDForm] = useState<Partial<DeductionComponent>>({ amountType: "fixed", preTax: false, amount: 0 });

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
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Create Earning Component</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input placeholder="Name" value={eForm.name || ""} onChange={(e) => setEForm({ ...eForm, name: e.target.value })} />
          <Input placeholder="Code (optional)" value={eForm.code || ""} onChange={(e) => setEForm({ ...eForm, code: e.target.value })} />
          <Select value={eForm.amountType as string} onValueChange={(v) => setEForm({ ...eForm, amountType: v as any })}>
            <SelectTrigger><SelectValue placeholder="Amount Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Fixed</SelectItem>
              <SelectItem value="percent_of_salary">Percent of Salary</SelectItem>
              <SelectItem value="percent_of_hourly">Percent of Hourly Rate</SelectItem>
            </SelectContent>
          </Select>
          <Input type="number" placeholder="Amount" value={eForm.amount ?? 0} onChange={(e) => setEForm({ ...eForm, amount: Number(e.target.value) })} />
          <Input type="date" value={eForm.effectiveStart || ""} onChange={(e) => setEForm({ ...eForm, effectiveStart: e.target.value })} />
          <Input type="date" value={eForm.effectiveEnd || ""} onChange={(e) => setEForm({ ...eForm, effectiveEnd: e.target.value })} />
          <div className="flex items-center gap-2">
            <label className="text-sm">Taxable</label>
            <input type="checkbox" checked={eForm.taxable ?? true} onChange={(e) => setEForm({ ...eForm, taxable: e.target.checked })} />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <Button onClick={saveEarning}>Save Earning</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Create Deduction Component</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input placeholder="Name" value={dForm.name || ""} onChange={(e) => setDForm({ ...dForm, name: e.target.value })} />
          <Input placeholder="Code (optional)" value={dForm.code || ""} onChange={(e) => setDForm({ ...dForm, code: e.target.value })} />
          <Select value={dForm.amountType as string} onValueChange={(v) => setDForm({ ...dForm, amountType: v as any })}>
            <SelectTrigger><SelectValue placeholder="Amount Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Fixed</SelectItem>
              <SelectItem value="percent_of_salary">Percent of Salary</SelectItem>
              <SelectItem value="percent_of_hourly">Percent of Hourly Rate</SelectItem>
              <SelectItem value="percent_of_gross">Percent of Gross</SelectItem>
            </SelectContent>
          </Select>
          <Input type="number" placeholder="Amount" value={dForm.amount ?? 0} onChange={(e) => setDForm({ ...dForm, amount: Number(e.target.value) })} />
          <Input type="date" value={dForm.effectiveStart || ""} onChange={(e) => setDForm({ ...dForm, effectiveStart: e.target.value })} />
          <Input type="date" value={dForm.effectiveEnd || ""} onChange={(e) => setDForm({ ...dForm, effectiveEnd: e.target.value })} />
          <div className="flex items-center gap-2">
            <label className="text-sm">Pre-Tax</label>
            <input type="checkbox" checked={dForm.preTax ?? false} onChange={(e) => setDForm({ ...dForm, preTax: e.target.checked })} />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <Button onClick={saveDeduction}>Save Deduction</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Existing Components</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2">Earnings</h4>
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
                {earnings.map(e => (
                  <TableRow key={e.id}>
                    <TableCell>{e.name}</TableCell>
                    <TableCell>{e.amount} ({e.amountType})</TableCell>
                    <TableCell><Badge variant="outline">{e.taxable ? "Yes" : "No"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" onClick={async () => { await deleteEarningComponent(e.id); showSuccess("Deleted"); refresh(); }}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {earnings.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No earnings</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div>
            <h4 className="font-medium mb-2">Deductions</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Pre-Tax</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deductions.map(d => (
                  <TableRow key={d.id}>
                    <TableCell>{d.name}</TableCell>
                    <TableCell>{d.amount} ({d.amountType})</TableCell>
                    <TableCell><Badge variant="outline">{d.preTax ? "Yes" : "No"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" onClick={async () => { await deleteDeductionComponent(d.id); showSuccess("Deleted"); refresh(); }}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {deductions.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No deductions</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompensationComponentsPage;