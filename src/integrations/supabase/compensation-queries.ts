"use client";

import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";

export type AmountType = 'fixed' | 'percent_of_salary' | 'percent_of_hourly' | 'percent_of_gross';
export type ComponentType = 'earning' | 'deduction';

export interface EarningComponent {
  id: string;
  userId: string | null;
  name: string;
  code?: string | null;
  amount: number;
  amountType: AmountType;
  effectiveStart?: string | null;
  effectiveEnd?: string | null;
  taxable: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface DeductionComponent {
  id: string;
  userId: string | null;
  name: string;
  code?: string | null;
  amount: number;
  amountType: AmountType;
  effectiveStart?: string | null;
  effectiveEnd?: string | null;
  preTax: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface EmployeeComponentAssignment {
  id: string;
  userId: string | null;
  employeeId: string;
  componentType: ComponentType;
  componentId: string;
  overrideAmount?: number | null;
  effectiveStart?: string | null;
  effectiveEnd?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

const toCamel = (obj: any) => {
  const out: any = {};
  for (const k in obj) {
    const camelKey = k.replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase());
    out[camelKey] = obj[k];
  }
  return out;
};
const toSnake = (obj: any) => {
  const out: any = {};
  for (const k in obj) {
    const snakeKey = k.replace(/[A-Z]/g, (L) => `_${L.toLowerCase()}`);
    out[snakeKey] = obj[k];
  }
  return out;
};

export const fetchEarningComponents = async (): Promise<EarningComponent[]> => {
  const { data, error } = await supabase.from("earning_components").select("*").order("name", { ascending: true });
  if (error) {
    console.error("compensation-queries: fetchEarningComponents", error);
    showError("Failed to load earning components.");
    return [];
  }
  return (data || []).map(toCamel) as EarningComponent[];
};

export const fetchDeductionComponents = async (): Promise<DeductionComponent[]> => {
  const { data, error } = await supabase.from("deduction_components").select("*").order("name", { ascending: true });
  if (error) {
    console.error("compensation-queries: fetchDeductionComponents", error);
    showError("Failed to load deduction components.");
    return [];
  }
  return (data || []).map(toCamel) as DeductionComponent[];
};

export const fetchEmployeeAssignments = async (): Promise<EmployeeComponentAssignment[]> => {
  const { data, error } = await supabase
    .from("employee_component_assignments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("compensation-queries: fetchEmployeeAssignments", error);
    showError("Failed to load assignments.");
    return [];
  }
  return (data || []).map(toCamel) as EmployeeComponentAssignment[];
};