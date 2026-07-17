"use client";

import { supabase } from "@/integrations/supabase/client";
import { keysToCamelCase, keysToSnakeCase } from "@/lib/case-converters";
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

const toCamel = (value: unknown): unknown => keysToCamelCase(value);
const toSnake = keysToSnakeCase;

/* Fetchers */
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

/* Upserts */
export const upsertEarningComponent = async (payload: Partial<EarningComponent>): Promise<EarningComponent | null> => {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes?.user?.id || null;
  const snake = toSnake({ ...payload, userId });
  const { data, error } = await supabase.from("earning_components").upsert(snake, { onConflict: "id" }).select();

  if (error) {
    console.error("compensation-queries: upsertEarningComponent", error);
    showError(`Failed to save earning component: ${error.message}`);
    return null;
  }
  return data && data[0] ? (toCamel(data[0]) as EarningComponent) : null;
};

export const upsertDeductionComponent = async (payload: Partial<DeductionComponent>): Promise<DeductionComponent | null> => {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes?.user?.id || null;
  const snake = toSnake({ ...payload, userId });
  const { data, error } = await supabase.from("deduction_components").upsert(snake, { onConflict: "id" }).select();

  if (error) {
    console.error("compensation-queries: upsertDeductionComponent", error);
    showError(`Failed to save deduction component: ${error.message}`);
    return null;
  }
  return data && data[0] ? (toCamel(data[0]) as DeductionComponent) : null;
};

export const upsertEmployeeAssignment = async (payload: Partial<EmployeeComponentAssignment>): Promise<EmployeeComponentAssignment | null> => {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes?.user?.id || null;
  const snake = toSnake({ ...payload, userId });
  const { data, error } = await supabase
    .from("employee_component_assignments")
    .upsert(snake, { onConflict: "id" })
    .select();

  if (error) {
    console.error("compensation-queries: upsertEmployeeAssignment", error);
    showError(`Failed to save assignment: ${error.message}`);
    return null;
  }
  return data && data[0] ? (toCamel(data[0]) as EmployeeComponentAssignment) : null;
};

/* Deletes */
export const deleteEarningComponent = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from("earning_components").delete().eq("id", id);
  if (error) {
    console.error("compensation-queries: deleteEarningComponent", error);
    showError(`Failed to delete earning component: ${error.message}`);
    return false;
  }
  return true;
};

export const deleteDeductionComponent = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from("deduction_components").delete().eq("id", id);
  if (error) {
    console.error("compensation-queries: deleteDeductionComponent", error);
    showError(`Failed to delete deduction component: ${error.message}`);
    return false;
  }
  return true;
};

export const deleteEmployeeAssignment = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from("employee_component_assignments").delete().eq("id", id);
  if (error) {
    console.error("compensation-queries: deleteEmployeeAssignment", error);
    showError(`Failed to delete assignment: ${error.message}`);
    return false;
  }
  return true;
};