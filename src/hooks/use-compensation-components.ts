"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchEarningComponents,
  fetchDeductionComponents,
  fetchEmployeeAssignments,
  EarningComponent,
  DeductionComponent,
  EmployeeComponentAssignment,
} from "@/integrations/supabase/compensation-queries";

export const useCompensationComponents = () => {
  const [earningComponents, setEarningComponents] = useState<EarningComponent[]>([]);
  const [deductionComponents, setDeductionComponents] = useState<DeductionComponent[]>([]);
  const [assignments, setAssignments] = useState<EmployeeComponentAssignment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const [earnings, deductions, assigns] = await Promise.all([
        fetchEarningComponents(),
        fetchDeductionComponents(),
        fetchEmployeeAssignments(),
      ]);
      setEarningComponents(earnings);
      setDeductionComponents(deductions);
      setAssignments(assigns);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { earningComponents, deductionComponents, assignments, isLoading, refetch };
};

export default useCompensationComponents;